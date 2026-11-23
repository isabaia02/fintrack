import { describe, test, before, after } from 'node:test';
import assert from 'node:assert/strict';

// Rate limit de login e de cadastro (integração com Postgres). Arquivo à parte porque os limites são lidos
// uma vez, na importação, e os contadores são por IP (todas as chamadas aqui saem do mesmo IP).
const URL_BANCO = process.env.TEST_DATABASE_URL;
const pular = !URL_BANCO && 'defina TEST_DATABASE_URL (banco com "test" no nome) para rodar';

describe('rate limit (integração com Postgres)', { skip: pular }, () => {
  let pool;
  let servidor;
  let url;

  before(async () => {
    assert.match(new URL(URL_BANCO).pathname, /test/i, 'TEST_DATABASE_URL deve apontar para um banco de teste.');
    process.env.DATABASE_URL = URL_BANCO;
    process.env.JWT_SECRET = 'segredo-de-teste-com-mais-de-trinta-caracteres';
    process.env.LOGIN_RATE_LIMIT_MAX = '3';
    process.env.CADASTRO_RATE_LIMIT_MAX = '3';
    ({ pool } = await import('../src/config/db.js'));
    const { criarApp } = await import('../src/app.js');
    const { readFile } = await import('node:fs/promises');
    await pool.query(await readFile(new URL('../database/schema.sql', import.meta.url), 'utf8'));
    servidor = await new Promise((resolver) => {
      const s = criarApp({ origens: ['http://localhost:5173'] }).listen(0, () => resolver(s));
    });
    url = `http://127.0.0.1:${servidor.address().port}`;
  });

  after(async () => {
    await new Promise((resolver) => servidor.close(resolver));
    await pool?.end();
  });

  const post = (caminho, corpo) => fetch(`${url}${caminho}`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(corpo),
  });
  const login = (email, senha) => post('/api/auth/login', { email, senha });

  test('cadastro: depois do limite por IP, 429 com { erro }', async () => {
    assert.equal((await post('/api/auth/cadastro', { nome: 'Ana', email: 'ana@teste.com', cpf: '52998224725', senha: 'senha1234' })).status, 201);
    assert.equal((await post('/api/auth/cadastro', { nome: 'Ana', email: 'ana@teste.com', cpf: '52998224725', senha: 'senha1234' })).status, 409);
    assert.equal((await post('/api/auth/cadastro', {})).status, 400);
    const bloqueado = await post('/api/auth/cadastro', { nome: 'Bia', email: 'bia@teste.com', cpf: '11144477735', senha: 'senha1234' });
    assert.equal(bloqueado.status, 429);
    assert.equal(typeof (await bloqueado.json()).erro, 'string');
    const { rows } = await pool.query("SELECT COUNT(*)::int AS n FROM usuarios WHERE email = 'bia@teste.com'");
    assert.equal(rows[0].n, 0, 'o cadastro bloqueado não pode ter sido feito');
  });

  test('login: acertos e pedidos inválidos (400) não consomem o limite', async () => {
    for (let i = 0; i < 6; i += 1) assert.equal((await login('ana@teste.com', 'senha1234')).status, 200);
    for (let i = 0; i < 6; i += 1) assert.equal((await post('/api/auth/login', {})).status, 400);
  });

  test('login: depois de 3 tentativas erradas, 429 (inclusive com a senha certa) e o aviso padrão', async () => {
    for (let i = 0; i < 3; i += 1) assert.equal((await login('ana@teste.com', 'errada123')).status, 401);
    const certa = await login('ana@teste.com', 'senha1234');
    assert.equal(certa.status, 429);
    const corpo = await certa.json();
    assert.deepEqual(Object.keys(corpo), ['erro']);
    assert.ok(certa.headers.get('ratelimit') || certa.headers.get('ratelimit-policy'), 'cabeçalhos RateLimit padrão');
  });
});

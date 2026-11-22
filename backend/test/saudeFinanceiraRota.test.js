import { describe, test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { subirApp } from './helpers.js';

// Teste de integração (mesmo banco de teste das demais rotas; ver README):
//   TEST_DATABASE_URL=postgresql://localhost:5432/fintrack_test npm test
const URL_BANCO = process.env.TEST_DATABASE_URL;
const pular = !URL_BANCO && 'defina TEST_DATABASE_URL (banco com "test" no nome) para rodar';

describe('GET /api/saude-financeira (integração com Postgres)', { skip: pular }, () => {
  let pool;
  let ALGORITMO_JWT;
  let hojeIso;
  let somarMeses;
  let criarRotas;
  let tratarErros;
  let contador = 0;
  const servidores = [];

  before(async () => {
    assert.match(new URL(URL_BANCO).pathname, /test/i, 'TEST_DATABASE_URL deve apontar para um banco de teste.');
    process.env.DATABASE_URL = URL_BANCO;
    process.env.JWT_SECRET = 'segredo-de-teste';
    ({ pool } = await import('../src/config/db.js'));
    ({ ALGORITMO_JWT } = await import('../src/config/jwt.js'));
    ({ hojeIso } = await import('../src/utils/periodo.js'));
    ({ somarMeses } = await import('../src/models/parcelamento.js'));
    ({ criarRotas } = await import('../src/routes/saudeFinanceira.routes.js'));
    ({ tratarErros } = await import('../src/middlewares/erros.js'));
    const { readFile } = await import('node:fs/promises');
    await pool.query(await readFile(new URL('../database/schema.sql', import.meta.url), 'utf8'));
  });

  after(async () => {
    await Promise.all(servidores.map((s) => s.fechar()));
    await pool?.end();
  });

  beforeEach(async () => {
    await pool.query('TRUNCATE usuarios RESTART IDENTITY CASCADE');
  });

  async function subir(gerarDicas) {
    const app = await subirApp((servidor) => {
      servidor.use('/api/saude-financeira', criarRotas({ gerarDicas }));
      servidor.use(tratarErros);
    });
    servidores.push(app);
    return app;
  }

  async function novoUsuario() {
    contador += 1;
    const { rows: [u] } = await pool.query(
      `INSERT INTO usuarios (nome, email, cpf, senha_hash) VALUES ($1, $2, $3, 'x') RETURNING id`,
      [`Usuário ${contador}`, `u${contador}@teste.com`, String(contador).padStart(11, '0')],
    );
    const cat = async (nome, tipo, cor) => (await pool.query(
      'INSERT INTO categorias (usuario_id, nome, tipo, cor) VALUES ($1, $2, $3, $4) RETURNING id', [u.id, nome, tipo, cor],
    )).rows[0].id;
    const fonte = async (nome, tipo, extra = {}) => (await pool.query(
      `INSERT INTO fontes_destinos (usuario_id, nome, tipo, dia_fechamento, dia_vencimento, limite, reserva)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [u.id, nome, tipo, extra.fech ?? null, extra.venc ?? null, extra.limite ?? null, extra.reserva ?? false],
    )).rows[0].id;
    const token = jwt.sign({}, process.env.JWT_SECRET, { subject: String(u.id), algorithm: ALGORITMO_JWT });
    return { id: u.id, token, cat, fonte };
  }

  const lancar = (u, { tipo, valor, data, categoria, fonte, parcela = 1, total = 1 }) => pool.query(
    `INSERT INTO lancamentos (usuario_id, tipo, descricao, valor, data, categoria_id, fonte_destino_id, parcela_atual, total_parcelas)
     VALUES ($1, $2, 'item', $3, $4, $5, $6, $7, $8)`,
    [u.id, tipo, valor, data, categoria, fonte, parcela, total],
  );

  const pedir = (app, token) => fetch(`${app.url}/api/saude-financeira`, { headers: token ? { authorization: `Bearer ${token}` } : {} });

  test('sem token: 401', async () => {
    const app = await subir();
    assert.equal((await pedir(app)).status, 401);
  });

  test('devolve aviso, 6 indicadores, projeção de 6 meses e dicas calculadas com os dados do usuário', async () => {
    const hoje = hojeIso();
    const mesAnterior = somarMeses(hoje, -1);
    const u = await novoUsuario();
    const salario = await u.cat('Salário', 'entrada', 7);
    const moradia = await u.cat('Moradia', 'saida', 1);
    const lazer = await u.cat('Lazer', 'saida', 4);
    const conta = await u.fonte('Conta corrente', 'conta');
    await u.fonte('Poupança', 'conta', { reserva: true });
    const visa = await u.fonte('Visa crédito', 'cartao_credito', { fech: 25, venc: 5, limite: 5000 });
    const primeiroDoMes = `${hoje.slice(0, 7)}-01`;
    const primeiroAnterior = `${mesAnterior.slice(0, 7)}-01`;

    await lancar(u, { tipo: 'entrada', valor: 5000, data: primeiroDoMes, categoria: salario, fonte: conta });
    await lancar(u, { tipo: 'saida', valor: 4800, data: primeiroDoMes, categoria: moradia, fonte: conta });
    await lancar(u, { tipo: 'saida', valor: 2000, data: primeiroAnterior, categoria: moradia, fonte: conta });
    await lancar(u, { tipo: 'saida', valor: 300, data: somarMeses(primeiroDoMes, 1), categoria: lazer, fonte: visa, parcela: 2, total: 3 });
    await lancar(u, { tipo: 'saida', valor: 300, data: somarMeses(primeiroDoMes, 2), categoria: lazer, fonte: visa, parcela: 3, total: 3 });

    const app = await subir(async () => { throw new Error('IA fora do ar'); });
    const resposta = await pedir(app, u.token);
    assert.equal(resposta.status, 200);
    const corpo = await resposta.json();

    assert.equal(corpo.aviso, 'Informações educativas, não constituem recomendação financeira profissional.');
    assert.equal(corpo.referencia, hoje.slice(0, 7));
    assert.equal(corpo.indicadores.length, 6);
    const por = Object.fromEntries(corpo.indicadores.map((i) => [i.id, i]));
    assert.equal(por.taxa_poupanca.valor, 4);
    assert.equal(por.taxa_poupanca.status, 'alerta');
    assert.equal(por.parcelas_futuras.valor, 600);
    assert.equal(por.reserva_emergencia.valor, 0);
    assert.equal(por.comprometimento_cartoes.status === 'info', false);

    assert.equal(corpo.projecao.serie.length, 6);
    assert.equal(corpo.projecao.serie[0].mes, hoje.slice(0, 7));
    assert.equal(typeof corpo.projecao.fica_negativo, 'boolean');
    assert.ok(corpo.dicas.length >= 1);
    assert.ok(corpo.dicas.every((d) => d.origem === 'regras'), 'IA falhou: só dicas por regras');
    assert.ok(corpo.dicas.some((d) => d.id === 'poupanca'));
  });

  test('a IA responde: as dicas dela vêm depois das dicas por regras', async () => {
    const u = await novoUsuario();
    const app = await subir(async (resumo) => {
      assert.ok(resumo.indicadores.length === 6);
      return ['Revise assinaturas esquecidas.'];
    });
    const corpo = await (await pedir(app, u.token)).json();
    assert.deepEqual(corpo.dicas.at(-1), { id: 'ia_1', texto: 'Revise assinaturas esquecidas.', origem: 'ia' });
    assert.ok(corpo.dicas.slice(0, -1).every((d) => d.origem === 'regras'));
  });

  test('usuário sem nenhum lançamento: 200, indicadores em "info" e projeção zerada', async () => {
    const u = await novoUsuario();
    const app = await subir();
    const resposta = await pedir(app, u.token);
    assert.equal(resposta.status, 200);
    const corpo = await resposta.json();
    assert.equal(corpo.indicadores.filter((i) => i.status === 'info').length >= 4, true);
    assert.deepEqual(corpo.projecao.serie.map((p) => p.saldo), [0, 0, 0, 0, 0, 0]);
    assert.equal(corpo.projecao.fica_negativo, false);
  });

  test('não mistura dados de outro usuário', async () => {
    const hoje = hojeIso();
    const a = await novoUsuario();
    const b = await novoUsuario();
    const catB = await b.cat('Salário', 'entrada', 7);
    const contaB = await b.fonte('Conta corrente', 'conta');
    await lancar(b, { tipo: 'entrada', valor: 9000, data: `${hoje.slice(0, 7)}-01`, categoria: catB, fonte: contaB });
    const app = await subir();
    const corpo = await (await pedir(app, a.token)).json();
    assert.equal(corpo.indicadores.find((i) => i.id === 'taxa_poupanca').valor, null);
    assert.equal(corpo.projecao.saldo_inicial, 0);
  });
});

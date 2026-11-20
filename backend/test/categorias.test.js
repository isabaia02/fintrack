import { describe, test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { subirApp } from './helpers.js';

// Teste de integração: precisa de um Postgres de teste, que é recriado a cada execução
// (o schema.sql dá DROP nas tabelas). Ex.:
//   createdb fintrack_test
//   TEST_DATABASE_URL=postgresql://localhost:5432/fintrack_test npm test
const URL_BANCO = process.env.TEST_DATABASE_URL;
const pular = !URL_BANCO && 'defina TEST_DATABASE_URL (banco com "test" no nome) para rodar';

describe('categorias (integração com Postgres)', { skip: pular }, () => {
  let app;
  let pool;
  let criarComPadroes;
  let ALGORITMO_JWT;
  let contador = 0;

  before(async () => {
    const nomeBanco = new URL(URL_BANCO).pathname;
    assert.match(nomeBanco, /test/i, 'TEST_DATABASE_URL deve apontar para um banco de teste (o schema é recriado).');

    process.env.DATABASE_URL = URL_BANCO;
    process.env.JWT_SECRET = 'segredo-de-teste';
    ({ pool } = await import('../src/config/db.js'));
    ({ criarComPadroes } = await import('../src/models/usuario.js'));
    ({ ALGORITMO_JWT } = await import('../src/config/jwt.js'));
    const { default: categoriasRoutes } = await import('../src/routes/categorias.routes.js');
    const { tratarErros } = await import('../src/middlewares/erros.js');

    const { readFile } = await import('node:fs/promises');
    await pool.query(await readFile(new URL('../database/schema.sql', import.meta.url), 'utf8'));

    app = await subirApp((servidor) => {
      servidor.use('/api/categorias', categoriasRoutes);
      servidor.use(tratarErros);
    });
  });

  after(async () => {
    await app?.fechar();
    await pool?.end();
  });

  beforeEach(async () => {
    await pool.query('TRUNCATE usuarios RESTART IDENTITY CASCADE');
  });

  // Usuário sem categorias (para testar os slots do zero) já com token válido.
  async function novoUsuario() {
    contador += 1;
    const { rows: [u] } = await pool.query(
      `INSERT INTO usuarios (nome, email, cpf, senha_hash) VALUES ($1, $2, $3, 'x') RETURNING id`,
      [`Usuário ${contador}`, `u${contador}@teste.com`, String(contador).padStart(11, '0')],
    );
    const token = jwt.sign({}, process.env.JWT_SECRET, { subject: String(u.id), algorithm: ALGORITMO_JWT });
    return { id: u.id, token };
  }

  const chamar = (usuario, metodo, caminho, corpo) =>
    fetch(`${app.url}/api/categorias${caminho}`, {
      method: metodo,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${usuario.token}` },
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
    }).then(async (res) => ({ status: res.status, corpo: res.status === 204 ? null : await res.json() }));

  const criar = (usuario, nome, tipo = 'saida') => chamar(usuario, 'POST', '', { nome, tipo });

  async function criarVarias(usuario, quantidade) {
    const criadas = [];
    for (let i = 1; i <= quantidade; i += 1) criadas.push((await criar(usuario, `Cat ${i}`)).corpo);
    return criadas;
  }

  async function lancar(usuario, categoriaId, vezes = 1) {
    const { rows: [fonte] } = await pool.query(
      `INSERT INTO fontes_destinos (usuario_id, nome, tipo) VALUES ($1, $2, 'conta')
       ON CONFLICT (usuario_id, nome) DO UPDATE SET nome = EXCLUDED.nome RETURNING id`,
      [usuario.id, 'Conta'],
    );
    for (let i = 0; i < vezes; i += 1) {
      await pool.query(
        `INSERT INTO lancamentos (usuario_id, tipo, descricao, valor, data, categoria_id, fonte_destino_id)
         VALUES ($1, 'saida', 'Teste', 10, '2026-01-15', $2, $3)`,
        [usuario.id, categoriaId, fonte.id],
      );
    }
  }

  test('exige autenticação', async () => {
    const res = await fetch(`${app.url}/api/categorias`);
    assert.equal(res.status, 401);
  });

  test('as 8 primeiras categorias recebem os slots 1..8 e da 9ª em diante cor é null', async () => {
    const usuario = await novoUsuario();
    const criadas = await criarVarias(usuario, 10);
    assert.deepEqual(criadas.map((c) => c.cor), [1, 2, 3, 4, 5, 6, 7, 8, null, null]);
  });

  test('a cor enviada no corpo é ignorada e o PUT nunca a altera', async () => {
    const usuario = await novoUsuario();
    const { corpo: criada } = await chamar(usuario, 'POST', '', { nome: 'Mercado', tipo: 'saida', cor: 5 });
    assert.equal(criada.cor, 1);

    const editada = await chamar(usuario, 'PUT', `/${criada.id}`, { nome: 'Supermercado', cor: 8 });
    assert.equal(editada.status, 200);
    assert.equal(editada.corpo.nome, 'Supermercado');
    assert.equal(editada.corpo.cor, 1);
  });

  test('o menor slot livre é reaproveitado depois de excluir', async () => {
    const usuario = await novoUsuario();
    const criadas = await criarVarias(usuario, 8);

    assert.equal((await chamar(usuario, 'DELETE', `/${criadas[4].id}`)).status, 204); // slot 5
    assert.equal((await chamar(usuario, 'DELETE', `/${criadas[2].id}`)).status, 204); // slot 3

    assert.equal((await criar(usuario, 'Nova A')).corpo.cor, 3);
    assert.equal((await criar(usuario, 'Nova B')).corpo.cor, 5);
    assert.equal((await criar(usuario, 'Nova C')).corpo.cor, null);
  });

  test('criações em paralelo não repetem slot', async () => {
    const usuario = await novoUsuario();
    const respostas = await Promise.all(
      Array.from({ length: 12 }, (_, i) => criar(usuario, `Paralela ${i}`)),
    );
    assert.ok(respostas.every((r) => r.status === 201));

    const cores = respostas.map((r) => r.corpo.cor);
    assert.deepEqual(cores.filter((c) => c !== null).sort((a, b) => a - b), [1, 2, 3, 4, 5, 6, 7, 8]);
    assert.equal(cores.filter((c) => c === null).length, 4);
  });

  test('usuário cadastrado com as categorias padrão já usa os 8 slots: a nova fica sem cor', async () => {
    const { id } = await criarComPadroes({ nome: 'Ana', email: 'ana@teste.com', cpf: '52998224725', senhaHash: 'x' });
    const token = jwt.sign({}, process.env.JWT_SECRET, { subject: String(id), algorithm: ALGORITMO_JWT });
    const usuario = { id, token };

    const lista = (await chamar(usuario, 'GET', '')).corpo;
    assert.equal(lista.length, 9);
    assert.equal(lista.find((c) => c.nome === 'Freelance').cor, null);
    assert.equal((await criar(usuario, 'Pets')).corpo.cor, null);
  });

  test('GET devolve total_lancamentos por categoria e aceita filtro por tipo', async () => {
    const usuario = await novoUsuario();
    const { corpo: mercado } = await criar(usuario, 'Mercado');
    await criar(usuario, 'Salário', 'entrada');
    await lancar(usuario, mercado.id, 3);

    const todas = (await chamar(usuario, 'GET', '')).corpo;
    assert.equal(todas.find((c) => c.nome === 'Mercado').total_lancamentos, 3);
    assert.equal(todas.find((c) => c.nome === 'Salário').total_lancamentos, 0);

    const entradas = (await chamar(usuario, 'GET', '?tipo=entrada')).corpo;
    assert.deepEqual(entradas.map((c) => c.nome), ['Salário']);
    assert.equal((await chamar(usuario, 'GET', '?tipo=x')).status, 400);
  });

  test('excluir categoria com lançamentos devolve 409 com a quantidade e não apaga', async () => {
    const usuario = await novoUsuario();
    const { corpo: categoria } = await criar(usuario, 'Mercado');
    await lancar(usuario, categoria.id, 12);

    const res = await chamar(usuario, 'DELETE', `/${categoria.id}`);
    assert.equal(res.status, 409);
    assert.equal(
      res.corpo.erro,
      'Esta categoria tem 12 lançamentos. Mova-os para outra categoria antes de excluir.',
    );
    assert.equal((await chamar(usuario, 'GET', '')).corpo.length, 1);
  });

  test('a mensagem do 409 de exclusão usa o singular com 1 lançamento', async () => {
    const usuario = await novoUsuario();
    const { corpo: categoria } = await criar(usuario, 'Mercado');
    await lancar(usuario, categoria.id, 1);

    const res = await chamar(usuario, 'DELETE', `/${categoria.id}`);
    assert.equal(res.status, 409);
    assert.equal(res.corpo.erro, 'Esta categoria tem 1 lançamento. Mova-o para outra categoria antes de excluir.');
  });

  test('excluir categoria sem lançamentos devolve 204 e ela some da listagem', async () => {
    const usuario = await novoUsuario();
    const { corpo: categoria } = await criar(usuario, 'Mercado');

    assert.equal((await chamar(usuario, 'DELETE', `/${categoria.id}`)).status, 204);
    assert.deepEqual((await chamar(usuario, 'GET', '')).corpo, []);
  });

  test('o tipo fica travado enquanto a categoria tem lançamentos', async () => {
    const usuario = await novoUsuario();
    const { corpo: comLancamento } = await criar(usuario, 'Mercado');
    const { corpo: semLancamento } = await criar(usuario, 'Extras');
    await lancar(usuario, comLancamento.id, 2);

    const bloqueado = await chamar(usuario, 'PUT', `/${comLancamento.id}`, { nome: 'Mercado', tipo: 'entrada' });
    assert.equal(bloqueado.status, 409);
    assert.ok(bloqueado.corpo.campos.tipo);

    // Mesmo tipo (ou tipo omitido) não é mudança: renomear continua permitido.
    const renomeado = await chamar(usuario, 'PUT', `/${comLancamento.id}`, { nome: 'Supermercado', tipo: 'saida' });
    assert.equal(renomeado.status, 200);

    const trocado = await chamar(usuario, 'PUT', `/${semLancamento.id}`, { nome: 'Extras', tipo: 'entrada' });
    assert.equal(trocado.status, 200);
    assert.equal(trocado.corpo.tipo, 'entrada');
  });

  test('categoria de outro usuário devolve 404 em PUT e DELETE e não aparece no GET', async () => {
    const dona = await novoUsuario();
    const intruso = await novoUsuario();
    const { corpo: categoria } = await criar(dona, 'Mercado');

    const put = await chamar(intruso, 'PUT', `/${categoria.id}`, { nome: 'Invadida' });
    assert.equal(put.status, 404);
    assert.equal((await chamar(intruso, 'DELETE', `/${categoria.id}`)).status, 404);
    assert.deepEqual((await chamar(intruso, 'GET', '')).corpo, []);

    const intacta = (await chamar(dona, 'GET', '')).corpo;
    assert.deepEqual(intacta.map((c) => c.nome), ['Mercado']);
  });

  test('ids inexistentes ou malformados devolvem 404', async () => {
    const usuario = await novoUsuario();
    for (const id of ['999999', 'abc', '0', '99999999999999']) {
      assert.equal((await chamar(usuario, 'DELETE', `/${id}`)).status, 404, `DELETE /${id}`);
      assert.equal((await chamar(usuario, 'PUT', `/${id}`, { nome: 'X' })).status, 404, `PUT /${id}`);
    }
  });

  test('nome duplicado (mesmo usuário e tipo) devolve 409 mesmo com caixa diferente', async () => {
    const usuario = await novoUsuario();
    const outro = await novoUsuario();
    await criar(usuario, 'Mercado');

    const duplicada = await criar(usuario, '  mercado ');
    assert.equal(duplicada.status, 409);
    assert.ok(duplicada.corpo.campos.nome);

    assert.equal((await criar(usuario, 'Mercado', 'entrada')).status, 201, 'outro tipo pode repetir o nome');
    assert.equal((await criar(outro, 'Mercado')).status, 201, 'outro usuário pode repetir o nome');

    const { corpo: extras } = await criar(usuario, 'Extras');
    const renomeando = await chamar(usuario, 'PUT', `/${extras.id}`, { nome: 'MERCADO' });
    assert.equal(renomeando.status, 409);
  });

  test('dados inválidos devolvem 400 no padrão { erro, campos }', async () => {
    const usuario = await novoUsuario();

    const vazio = await chamar(usuario, 'POST', '', {});
    assert.equal(vazio.status, 400);
    assert.deepEqual(Object.keys(vazio.corpo.campos).sort(), ['nome', 'tipo']);

    const longo = await criar(usuario, 'a'.repeat(61));
    assert.equal(longo.status, 400);
    assert.ok(longo.corpo.campos.nome);

    assert.equal((await criar(usuario, 'Ok', 'foo')).status, 400);
  });
});

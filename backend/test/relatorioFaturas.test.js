import { describe, test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { subirApp } from './helpers.js';

// Teste de integração (mesmo banco de teste das demais rotas; ver README):
//   TEST_DATABASE_URL=postgresql://localhost:5432/fintrack_test npm test
const URL_BANCO = process.env.TEST_DATABASE_URL;
const pular = !URL_BANCO && 'defina TEST_DATABASE_URL (banco com "test" no nome) para rodar';

describe('GET /api/relatorios/faturas (integração com Postgres)', { skip: pular }, () => {
  let app;
  let pool;
  let ALGORITMO_JWT;
  let somarMeses;
  let hojeIso;
  let contador = 0;

  before(async () => {
    assert.match(new URL(URL_BANCO).pathname, /test/i, 'TEST_DATABASE_URL deve apontar para um banco de teste.');

    process.env.DATABASE_URL = URL_BANCO;
    process.env.JWT_SECRET = 'segredo-de-teste';
    ({ pool } = await import('../src/config/db.js'));
    ({ ALGORITMO_JWT } = await import('../src/config/jwt.js'));
    ({ somarMeses } = await import('../src/models/parcelamento.js'));
    ({ hojeIso } = await import('../src/utils/periodo.js'));
    const { default: rotas } = await import('../src/routes/relatorios.routes.js');
    const { tratarErros } = await import('../src/middlewares/erros.js');

    const { readFile } = await import('node:fs/promises');
    await pool.query(await readFile(new URL('../database/schema.sql', import.meta.url), 'utf8'));

    app = await subirApp((servidor) => {
      servidor.use('/api/relatorios', rotas);
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

  async function novoUsuario() {
    contador += 1;
    const { rows: [u] } = await pool.query(
      `INSERT INTO usuarios (nome, email, cpf, senha_hash) VALUES ($1, $2, $3, 'x') RETURNING id`,
      [`Usuário ${contador}`, `u${contador}@teste.com`, String(contador).padStart(11, '0')],
    );
    const { rows: [categoria] } = await pool.query(
      `INSERT INTO categorias (usuario_id, nome, tipo, cor) VALUES ($1, 'Geral', 'saida', 1) RETURNING id`,
      [u.id],
    );
    const token = jwt.sign({}, process.env.JWT_SECRET, { subject: String(u.id), algorithm: ALGORITMO_JWT });
    return { id: u.id, token, categoriaId: categoria.id };
  }

  async function novoCartao(usuario, nome, { fechamento = 25, vencimento = 5, limite = 5000 } = {}) {
    const { rows: [c] } = await pool.query(
      `INSERT INTO fontes_destinos (usuario_id, nome, tipo, dia_fechamento, dia_vencimento, limite)
       VALUES ($1, $2, 'cartao_credito', $3, $4, $5) RETURNING id`,
      [usuario.id, nome, fechamento, vencimento, limite],
    );
    return c.id;
  }

  async function lancar(usuario, fonteId, { descricao = 'Compra', data, valor, parcela = 1, total = 1, tipo = 'saida' }) {
    await pool.query(
      `INSERT INTO lancamentos (usuario_id, tipo, descricao, valor, data, categoria_id, fonte_destino_id,
                                parcela_atual, total_parcelas)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [usuario.id, tipo, descricao, valor, data, usuario.categoriaId, fonteId, parcela, total],
    );
  }

  // Dependendo do dia, a fatura fechada e ainda não vencida vem antes da atual; os testes olham a partir da aberta.
  const apartirDaAberta = (cartao) => cartao.faturas.slice(cartao.faturas.findIndex((f) => f.aberta));

  const consultar = (usuario, consulta = '') =>
    fetch(`${app.url}/api/relatorios/faturas${consulta}`, { headers: { Authorization: `Bearer ${usuario.token}` } })
      .then(async (res) => ({ status: res.status, corpo: await res.json() }));

  test('exige autenticação', async () => {
    assert.equal((await fetch(`${app.url}/api/relatorios/faturas`)).status, 401);
  });

  test('sem cartões devolve lista vazia', async () => {
    const u = await novoUsuario();
    const res = await consultar(u);
    assert.equal(res.status, 200);
    assert.deepEqual(res.corpo, { cartoes: [] });
  });

  test('por padrão devolve a atual + 3 próximas; fatura sem itens vem com itens [] e total 0', async () => {
    const u = await novoUsuario();
    await novoCartao(u, 'Nubank', { fechamento: 3, vencimento: 10, limite: 8000 });

    const { status, corpo } = await consultar(u);
    assert.equal(status, 200);
    const [nubank] = corpo.cartoes;
    assert.equal(nubank.nome, 'Nubank');
    assert.equal(nubank.limite, 8000);
    assert.equal(nubank.limite_utilizado, 0);
    assert.equal(nubank.limite_disponivel, 8000);
    const faturas = apartirDaAberta(nubank);
    assert.equal(faturas.length, 4);
    assert.deepEqual(faturas.map((f) => f.aberta), [true, false, false, false]);
    assert.equal(nubank.faturas.filter((f) => f.aberta).length, 1);
    for (const fatura of nubank.faturas) {
      assert.deepEqual(fatura.itens, []);
      assert.equal(fatura.total, 0);
      assert.match(fatura.referencia, /^\d{2}\/\d{4}$/);
      assert.match(fatura.fechamento, /^\d{4}-\d{2}-\d{2}$/);
      assert.match(fatura.vencimento, /^\d{4}-\d{2}-\d{2}$/);
    }
  });

  test('uma compra de hoje cai na fatura aberta; parcelas caem uma por fatura', async () => {
    const u = await novoUsuario();
    const cartao = await novoCartao(u, 'Visa', { limite: 1000 });
    const hoje = hojeIso();
    await lancar(u, cartao, { descricao: 'Mercado', data: hoje, valor: 50 });
    for (let k = 1; k <= 3; k += 1) {
      await lancar(u, cartao, { descricao: 'Notebook', data: somarMeses(hoje, k - 1), valor: 100, parcela: k, total: 3 });
    }

    const [visa] = (await consultar(u)).corpo.cartoes;
    const faturas = apartirDaAberta(visa);
    assert.deepEqual(faturas.map((f) => f.total), [150, 100, 100, 0]);
    assert.deepEqual(
      faturas[0].itens.map((i) => [i.descricao, i.valor, i.parcela_atual, i.total_parcelas]),
      [['Mercado', 50, 1, 1], ['Notebook', 100, 1, 3]],
    );
    assert.equal(faturas[1].itens[0].parcela_atual, 2);
    assert.equal(visa.limite_utilizado, 350);
    assert.equal(visa.limite_disponivel, 650);
  });

  test('o parâmetro meses controla quantas faturas seguintes vêm (e 0 devolve só a atual)', async () => {
    const u = await novoUsuario();
    await novoCartao(u, 'Visa');

    assert.equal(apartirDaAberta((await consultar(u, '?meses=0')).corpo.cartoes[0]).length, 1);
    assert.equal(apartirDaAberta((await consultar(u, '?meses=6')).corpo.cartoes[0]).length, 7);
  });

  test('compras antigas (já vencidas) e entradas não comprometem o limite', async () => {
    const u = await novoUsuario();
    const cartao = await novoCartao(u, 'Visa', { limite: 1000 });
    await lancar(u, cartao, { data: somarMeses(hojeIso(), -6), valor: 400 });
    await lancar(u, cartao, { data: hojeIso(), valor: 70, tipo: 'entrada' });

    const [visa] = (await consultar(u)).corpo.cartoes;
    assert.equal(visa.limite_utilizado, 0);
    assert.ok(visa.faturas.every((f) => f.total === 0));
  });

  test('meses inválido devolve 400 no padrão { erro, campos }', async () => {
    const u = await novoUsuario();
    for (const consulta of ['?meses=abc', '?meses=-1', '?meses=1.5', '?meses=25']) {
      const res = await consultar(u, consulta);
      assert.equal(res.status, 400, consulta);
      assert.equal(res.corpo.erro, 'Dados inválidos.');
      assert.ok(res.corpo.campos.meses, consulta);
    }
  });

  test('cada usuário vê só os próprios cartões e lançamentos', async () => {
    const dona = await novoUsuario();
    const outra = await novoUsuario();
    const cartaoDona = await novoCartao(dona, 'Visa da dona');
    await novoCartao(outra, 'Cartão da outra');
    await lancar(dona, cartaoDona, { data: hojeIso(), valor: 99 });

    const vistaPelaOutra = (await consultar(outra)).corpo.cartoes;
    assert.deepEqual(vistaPelaOutra.map((c) => c.nome), ['Cartão da outra']);
    assert.equal(vistaPelaOutra[0].limite_utilizado, 0);

    const vistaPelaDona = (await consultar(dona)).corpo.cartoes;
    assert.deepEqual(vistaPelaDona.map((c) => c.nome), ['Visa da dona']);
    assert.equal(vistaPelaDona[0].limite_utilizado, 99);
  });
});

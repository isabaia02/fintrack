import { describe, test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { subirApp } from './helpers.js';
import { mesCorrente } from '../src/utils/periodo.js';

const URL_BANCO = process.env.TEST_DATABASE_URL;
const pular = !URL_BANCO && 'defina TEST_DATABASE_URL (banco com "test" no nome) para rodar';

describe('relatório por categoria (integração com Postgres)', { skip: pular }, () => {
  let app;
  let pool;
  let ALGORITMO_JWT;
  let contador = 0;

  before(async () => {
    assert.match(new URL(URL_BANCO).pathname, /test/i, 'TEST_DATABASE_URL deve apontar para um banco de teste.');

    process.env.DATABASE_URL = URL_BANCO;
    process.env.JWT_SECRET = 'segredo-de-teste';
    ({ pool } = await import('../src/config/db.js'));
    ({ ALGORITMO_JWT } = await import('../src/config/jwt.js'));
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
    const token = jwt.sign({}, process.env.JWT_SECRET, { subject: String(u.id), algorithm: ALGORITMO_JWT });
    const inserir = async (sql, params) => (await pool.query(sql, [u.id, ...params])).rows[0].id;
    const conta = await inserir(
      "INSERT INTO fontes_destinos (usuario_id, nome, tipo) VALUES ($1, 'Conta corrente', 'conta') RETURNING id",
      [],
    );

    return {
      id: u.id,
      token,
      categoria: (nome, tipo, cor) =>
        inserir('INSERT INTO categorias (usuario_id, nome, tipo, cor) VALUES ($1, $2, $3, $4) RETURNING id', [nome, tipo, cor]),
      lancar: (categoriaId, tipo, valor, data) =>
        inserir(
          `INSERT INTO lancamentos (usuario_id, tipo, descricao, valor, data, categoria_id, fonte_destino_id)
           VALUES ($1, $2, 'Teste', $3, $4, $5, $6) RETURNING id`,
          [tipo, valor, data, categoriaId, conta],
        ),
    };
  }

  const consultar = (usuario, query = '') =>
    fetch(`${app.url}/api/relatorios/categorias${query}`, { headers: { Authorization: `Bearer ${usuario.token}` } })
      .then(async (res) => ({ status: res.status, corpo: await res.json() }));

  test('exige autenticação', async () => {
    assert.equal((await fetch(`${app.url}/api/relatorios/categorias`)).status, 401);
  });

  test('reproduz o exemplo do enunciado (outubro/2026)', async () => {
    const u = await novoUsuario();
    const moradia = await u.categoria('Moradia', 'saida', 1);
    const alimentacao = await u.categoria('Alimentação', 'saida', 2);
    const mobilidade = await u.categoria('Mobilidade', 'saida', 5);
    const salario = await u.categoria('Salário', 'entrada', 3);

    await u.lancar(moradia, 'saida', 1500, '2026-10-05');
    await u.lancar(alimentacao, 'saida', 600, '2026-10-06');
    await u.lancar(alimentacao, 'saida', 380.5, '2026-10-31');
    await u.lancar(mobilidade, 'saida', 769.5, '2026-10-01');
    await u.lancar(salario, 'entrada', 6800, '2026-10-05');

    await u.lancar(moradia, 'saida', 1500, '2026-09-05');
    await u.lancar(alimentacao, 'saida', 870, '2026-09-30');
    await u.lancar(mobilidade, 'saida', 812.3, '2026-09-01');
    await u.lancar(salario, 'entrada', 6800, '2026-09-05');

    await u.lancar(moradia, 'saida', 999, '2026-08-31');
    await u.lancar(moradia, 'saida', 999, '2026-11-01');
    const outro = await novoUsuario();
    await outro.lancar(await outro.categoria('Moradia', 'saida', 1), 'saida', 999, '2026-10-10');

    const res = await consultar(u, '?inicio=2026-10-01&fim=2026-10-31');

    assert.equal(res.status, 200);
    assert.deepEqual(res.corpo, {
      periodo: { inicio: '2026-10-01', fim: '2026-10-31' },
      periodoAnterior: { inicio: '2026-09-01', fim: '2026-09-30' },
      saidas: {
        total: 3250,
        totalAnterior: 3182.3,
        variacaoPercentual: 2.1,
        categorias: [
          { id: moradia, nome: 'Moradia', cor: 1, total: 1500, totalAnterior: 1500, percentual: 46.15, variacaoPercentual: 0 },
          { id: alimentacao, nome: 'Alimentação', cor: 2, total: 980.5, totalAnterior: 870, percentual: 30.17, variacaoPercentual: 12.7 },
          { id: mobilidade, nome: 'Mobilidade', cor: 5, total: 769.5, totalAnterior: 812.3, percentual: 23.68, variacaoPercentual: -5.3 },
        ],
      },
      entradas: {
        total: 6800,
        totalAnterior: 6800,
        variacaoPercentual: 0,
        categorias: [
          { id: salario, nome: 'Salário', cor: 3, total: 6800, totalAnterior: 6800, percentual: 100, variacaoPercentual: 0 },
        ],
      },
    });
    const soma = res.corpo.saidas.categorias.reduce((s, c) => s + c.percentual, 0);
    assert.ok(Math.abs(soma - 100) < 0.05);
  });

  test('categoria só no período anterior aparece zerada; categoria nova não tem variação', async () => {
    const u = await novoUsuario();
    const lazer = await u.categoria('Lazer', 'saida', 4);
    const saude = await u.categoria('Saúde', 'saida', 6);
    await u.lancar(lazer, 'saida', 72, '2026-10-10');
    await u.lancar(saude, 'saida', 250, '2026-11-09');

    const { corpo } = await consultar(u, '?inicio=2026-11-01&fim=2026-11-30');

    assert.deepEqual(corpo.saidas, {
      total: 250,
      totalAnterior: 72,
      variacaoPercentual: 247.2,
      categorias: [
        { id: saude, nome: 'Saúde', cor: 6, total: 250, totalAnterior: 0, percentual: 100, variacaoPercentual: null },
        { id: lazer, nome: 'Lazer', cor: 4, total: 0, totalAnterior: 72, percentual: 0, variacaoPercentual: -100 },
      ],
    });
  });

  test('período livre compara com a mesma quantidade de dias imediatamente antes', async () => {
    const u = await novoUsuario();
    const lazer = await u.categoria('Lazer', 'saida', 4);
    await u.lancar(lazer, 'saida', 50, '2026-10-19');
    await u.lancar(lazer, 'saida', 40, '2026-09-30');
    await u.lancar(lazer, 'saida', 30, '2026-09-29');

    const { corpo } = await consultar(u, '?inicio=2026-10-10&fim=2026-10-19');

    assert.deepEqual(corpo.periodoAnterior, { inicio: '2026-09-30', fim: '2026-10-09' });
    assert.equal(corpo.saidas.total, 50);
    assert.equal(corpo.saidas.totalAnterior, 40);
  });

  test('sem lançamentos devolve totais zerados', async () => {
    const u = await novoUsuario();
    const { status, corpo } = await consultar(u, '?inicio=2026-10-01&fim=2026-10-31');

    assert.equal(status, 200);
    assert.deepEqual(corpo.saidas, { total: 0, totalAnterior: 0, variacaoPercentual: 0, categorias: [] });
    assert.deepEqual(corpo.entradas, { total: 0, totalAnterior: 0, variacaoPercentual: 0, categorias: [] });
  });

  test('sem inicio/fim usa o mês corrente', async () => {
    const u = await novoUsuario();
    const { corpo } = await consultar(u);
    assert.deepEqual(corpo.periodo, mesCorrente());
  });

  test('400 para período inválido', async () => {
    const u = await novoUsuario();

    const inexistente = await consultar(u, '?inicio=2026-02-30&fim=2026-03-31');
    assert.equal(inexistente.status, 400);
    assert.deepEqual(inexistente.corpo, {
      erro: 'Dados inválidos.',
      campos: { inicio: 'Informe uma data inicial válida (AAAA-MM-DD).' },
    });

    const invertido = await consultar(u, '?inicio=2026-10-31&fim=2026-10-01');
    assert.equal(invertido.status, 400);
    assert.equal(invertido.corpo.campos.fim, 'A data final deve ser igual ou posterior à data inicial.');

    const malformado = await consultar(u, '?inicio=10/2026&fim=abc');
    assert.equal(malformado.status, 400);
    assert.deepEqual(Object.keys(malformado.corpo.campos), ['inicio', 'fim']);
  });
});

import { describe, test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { subirApp } from './helpers.js';
import { mesCorrente } from '../src/utils/periodo.js';

const URL_BANCO = process.env.TEST_DATABASE_URL;
const pular = !URL_BANCO && 'defina TEST_DATABASE_URL (banco com "test" no nome) para rodar';

describe('relatórios (integração com Postgres)', { skip: pular }, () => {
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
      conta,
      fonte: (nome, tipo, reserva = false) => {
        const cartao = tipo === 'cartao_credito';
        return inserir(
          `INSERT INTO fontes_destinos (usuario_id, nome, tipo, reserva, dia_fechamento, dia_vencimento, limite)
           VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
          [nome, tipo, reserva, cartao ? 25 : null, cartao ? 5 : null, cartao ? 5000 : null],
        );
      },
      categoria: (nome, tipo, cor) =>
        inserir('INSERT INTO categorias (usuario_id, nome, tipo, cor) VALUES ($1, $2, $3, $4) RETURNING id', [nome, tipo, cor]),
      lancar: (categoriaId, tipo, valor, data, fonteDestinoId = conta) =>
        inserir(
          `INSERT INTO lancamentos (usuario_id, tipo, descricao, valor, data, categoria_id, fonte_destino_id)
           VALUES ($1, $2, 'Teste', $3, $4, $5, $6) RETURNING id`,
          [tipo, valor, data, categoriaId, fonteDestinoId],
        ),
    };
  }

  const consultar = (usuario, query = '', rota = 'categorias') =>
    fetch(`${app.url}/api/relatorios/${rota}${query}`, { headers: { Authorization: `Bearer ${usuario.token}` } })
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

  test('fontes-destinos: entradas por fonte, saídas por destino e saldo por conta', async () => {
    const u = await novoUsuario();
    const salario = await u.fonte('Salário', 'renda');
    const poupanca = await u.fonte('Poupança', 'conta', true);
    const nubank = await u.fonte('Nubank', 'cartao_credito');
    const visa = await u.fonte('Visa crédito', 'cartao_credito');
    const remuneracao = await u.categoria('Salário', 'entrada', 3);
    const freelance = await u.categoria('Freelance', 'entrada', 7);
    const moradia = await u.categoria('Moradia', 'saida', 1);
    const lazer = await u.categoria('Lazer', 'saida', 4);

    await u.lancar(remuneracao, 'entrada', 6800, '2026-11-05', salario);
    await u.lancar(freelance, 'entrada', 550, '2026-11-12');
    await u.lancar(moradia, 'saida', 1500, '2026-11-01');
    await u.lancar(moradia, 'saida', 250, '2026-11-30');
    await u.lancar(lazer, 'saida', 361.3, '2026-11-20', nubank);
    await u.lancar(lazer, 'saida', 72, '2026-11-10', visa);
    await u.lancar(lazer, 'saida', 33.34, '2026-11-15', visa);

    const res = await consultar(u, '?inicio=2026-11-01&fim=2026-11-30', 'fontes-destinos');

    assert.equal(res.status, 200);
    assert.deepEqual(res.corpo, {
      periodo: { inicio: '2026-11-01', fim: '2026-11-30' },
      entradas: {
        total: 7350,
        fontes: [
          { id: salario, nome: 'Salário', tipo: 'renda', total: 6800 },
          { id: u.conta, nome: 'Conta corrente', tipo: 'conta', total: 550 },
        ],
      },
      saidas: {
        total: 2216.64,
        destinos: [
          { id: u.conta, nome: 'Conta corrente', tipo: 'conta', total: 1750 },
          { id: nubank, nome: 'Nubank', tipo: 'cartao_credito', total: 361.3 },
          { id: visa, nome: 'Visa crédito', tipo: 'cartao_credito', total: 105.34 },
        ],
      },
      contas: [
        { id: u.conta, nome: 'Conta corrente', reserva: false, entradas: 550, saidas: 1750, saldo: -1200 },
        { id: poupanca, nome: 'Poupança', reserva: true, entradas: 0, saidas: 0, saldo: 0 },
      ],
      saldoContas: -1200,
    });
  });

  test('fontes-destinos: inclui lançamentos em inicio e fim, ignora o dia antes e o dia depois', async () => {
    const u = await novoUsuario();
    const moradia = await u.categoria('Moradia', 'saida', 1);
    const salario = await u.categoria('Salário', 'entrada', 3);
    await u.lancar(salario, 'entrada', 1000, '2026-11-01');
    await u.lancar(moradia, 'saida', 300, '2026-11-30');
    await u.lancar(salario, 'entrada', 999, '2026-10-31');
    await u.lancar(moradia, 'saida', 999, '2026-12-01');

    const { corpo } = await consultar(u, '?inicio=2026-11-01&fim=2026-11-30', 'fontes-destinos');

    assert.equal(corpo.entradas.total, 1000);
    assert.equal(corpo.saidas.total, 300);
    assert.deepEqual(corpo.contas, [
      { id: u.conta, nome: 'Conta corrente', reserva: false, entradas: 1000, saidas: 300, saldo: 700 },
    ]);
    assert.equal(corpo.saldoContas, 700);
  });

  test('fontes-destinos: não mistura dados de outro usuário', async () => {
    const u = await novoUsuario();
    const moradia = await u.categoria('Moradia', 'saida', 1);
    await u.lancar(moradia, 'saida', 100, '2026-11-10');

    const outro = await novoUsuario();
    const renda = await outro.fonte('Salário', 'renda');
    const cartao = await outro.fonte('Nubank', 'cartao_credito');
    const salarioOutro = await outro.categoria('Salário', 'entrada', 3);
    const lazerOutro = await outro.categoria('Lazer', 'saida', 4);
    await outro.lancar(salarioOutro, 'entrada', 5000, '2026-11-05', renda);
    await outro.lancar(lazerOutro, 'saida', 700, '2026-11-08', cartao);
    await outro.lancar(lazerOutro, 'saida', 400, '2026-11-09');
    // Lançamento de outro usuário apontando para a conta de `u`: não pode entrar no saldo dela.
    await outro.lancar(salarioOutro, 'entrada', 900, '2026-11-12', u.conta);

    const { corpo } = await consultar(u, '?inicio=2026-11-01&fim=2026-11-30', 'fontes-destinos');

    assert.deepEqual(corpo.entradas, { total: 0, fontes: [] });
    assert.deepEqual(corpo.saidas, {
      total: 100,
      destinos: [{ id: u.conta, nome: 'Conta corrente', tipo: 'conta', total: 100 }],
    });
    assert.deepEqual(corpo.contas, [
      { id: u.conta, nome: 'Conta corrente', reserva: false, entradas: 0, saidas: 100, saldo: -100 },
    ]);
    assert.equal(corpo.saldoContas, -100);
  });

  test('fontes-destinos: separa pelo tipo do lançamento, não pelo tipo da fonte/destino', async () => {
    const u = await novoUsuario();
    const salario = await u.fonte('Salário', 'renda');
    const visa = await u.fonte('Visa crédito', 'cartao_credito');
    const remuneracao = await u.categoria('Salário', 'entrada', 3);
    const outros = await u.categoria('Outros', 'saida', 8);
    await u.lancar(remuneracao, 'entrada', 80, '2026-11-15', visa);
    await u.lancar(outros, 'saida', 20, '2026-11-16', salario);

    const { corpo } = await consultar(u, '?inicio=2026-11-01&fim=2026-11-30', 'fontes-destinos');

    assert.deepEqual(corpo.entradas.fontes, [{ id: visa, nome: 'Visa crédito', tipo: 'cartao_credito', total: 80 }]);
    assert.deepEqual(corpo.saidas.destinos, [{ id: salario, nome: 'Salário', tipo: 'renda', total: 20 }]);
  });

  test('fontes-destinos: sem lançamentos lista as contas zeradas', async () => {
    const u = await novoUsuario();
    const { status, corpo } = await consultar(u, '?inicio=2026-11-01&fim=2026-11-30', 'fontes-destinos');

    assert.equal(status, 200);
    assert.deepEqual(corpo.entradas, { total: 0, fontes: [] });
    assert.deepEqual(corpo.saidas, { total: 0, destinos: [] });
    assert.deepEqual(corpo.contas, [
      { id: u.conta, nome: 'Conta corrente', reserva: false, entradas: 0, saidas: 0, saldo: 0 },
    ]);
    assert.equal(corpo.saldoContas, 0);
  });

  test('fontes-destinos: exige autenticação', async () => {
    assert.equal((await fetch(`${app.url}/api/relatorios/fontes-destinos`)).status, 401);
  });

  test('fontes-destinos: sem inicio/fim usa o mês corrente', async () => {
    const u = await novoUsuario();
    const { corpo } = await consultar(u, '', 'fontes-destinos');
    assert.deepEqual(corpo.periodo, mesCorrente());
  });

  test('fontes-destinos: 400 para período inválido', async () => {
    const u = await novoUsuario();
    const { status, corpo } = await consultar(u, '?inicio=2026-10-31&fim=2026-10-01', 'fontes-destinos');

    assert.equal(status, 400);
    assert.deepEqual(corpo, {
      erro: 'Dados inválidos.',
      campos: { fim: 'A data final deve ser igual ou posterior à data inicial.' },
    });
  });
});

import { describe, test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const URL_BANCO = process.env.TEST_DATABASE_URL;
const pular = !URL_BANCO && 'defina TEST_DATABASE_URL (banco com "test" no nome) para rodar';

const NOVEMBRO = { inicio: '2026-11-01', fim: '2026-11-30', pagina: 1 };
const HOJE = '2026-11-22';

describe('seed de demonstração (integração com Postgres)', { skip: pular }, () => {
  let pool;
  let emTransacao;
  let demonstracao;
  let Lancamento;
  let buscarFaturas;
  let porCategoria;
  let ids;
  let idsDaPrimeiraExecucao;

  const popular = (hoje = HOJE) => emTransacao((client) => demonstracao.popularDemonstracao(client, 'hash-de-teste', hoje));
  const contar = async (sql, params) => (await pool.query(sql, params)).rows[0].total;

  before(async () => {
    assert.match(new URL(URL_BANCO).pathname, /test/i, 'TEST_DATABASE_URL deve apontar para um banco de teste.');
    process.env.DATABASE_URL = URL_BANCO;
    ({ pool, emTransacao } = await import('../src/config/db.js'));
    demonstracao = await import('../database/demonstracao.js');
    Lancamento = await import('../src/models/lancamento.js');
    ({ buscarFaturas } = await import('../src/models/faturasCartao.js'));
    ({ porCategoria } = await import('../src/models/relatorio.js'));

    await pool.query(await readFile(new URL('../database/schema.sql', import.meta.url), 'utf8'));
    await pool.query(
      `INSERT INTO usuarios (nome, email, cpf, senha_hash) VALUES ('Outra pessoa', 'outra@teste.com', '39053344705', 'x')`,
    );
    idsDaPrimeiraExecucao = await popular();
    ids = await popular();
  });

  after(async () => {
    await pool?.end();
  });

  test('é idempotente, mantém os ids e não mexe em outros usuários', async () => {
    assert.deepEqual(ids, idsDaPrimeiraExecucao);
    assert.equal(await contar('SELECT COUNT(*)::int AS total FROM usuarios'), 3);
    assert.equal(await contar(`SELECT COUNT(*)::int AS total FROM usuarios WHERE email = 'outra@teste.com'`), 1);
    assert.equal(
      await contar('SELECT COUNT(*)::int AS total FROM lancamentos WHERE usuario_id = $1', [ids['ana@email.com']]),
      34,
    );
  });

  test('Ana: lançamentos de novembro do design e a parcela 3/10 do Notebook', async () => {
    const { totais, total, itens } = await Lancamento.listar(ids['ana@email.com'], NOVEMBRO);
    assert.equal(total, 9);
    assert.deepEqual(totais, { entradas: 7350, saidas: 2666.64, saldo: 4683.36 });

    const notebook = itens.find((l) => l.descricao === 'Notebook');
    assert.equal(notebook.valor, 450);
    assert.equal(notebook.parcela_atual, 3);
    assert.equal(notebook.total_parcelas, 10);
    assert.equal(Math.round((totais.saidas - notebook.valor) * 100) / 100, 2216.64);

    const cabo = itens.find((l) => l.descricao === 'Cabo e carregador');
    assert.deepEqual([cabo.valor, cabo.parcela_atual, cabo.total_parcelas], [33.34, 1, 3]);
  });

  test('Ana: faturas do Visa e do Nubank batem com o design', async () => {
    const cartoes = await buscarFaturas(ids['ana@email.com'], { meses: 3, hoje: HOJE });
    const visa = cartoes.find((c) => c.nome === 'Visa crédito');
    const nubank = cartoes.find((c) => c.nome === 'Nubank');

    assert.deepEqual(
      visa.faturas.map((f) => [f.referencia, f.fechamento, f.vencimento, f.total]),
      [
        ['12/2026', '2026-11-25', '2026-12-05', 555.34],
        ['01/2027', '2026-12-25', '2027-01-05', 483.33],
        ['02/2027', '2027-01-25', '2027-02-05', 483.33],
        ['03/2027', '2027-02-25', '2027-03-05', 450],
      ],
    );
    assert.deepEqual(
      visa.faturas[0].itens.map((i) => [i.data, i.descricao, i.valor]),
      [['2026-11-10', 'Cinema', 72], ['2026-11-15', 'Cabo e carregador', 33.34], ['2026-11-20', 'Notebook', 450]],
    );
    assert.equal(visa.limite_utilizado, 3772);
    assert.equal(visa.limite_disponivel, 1228);

    assert.deepEqual(nubank.faturas.map((f) => f.total), [361.3, 0, 0, 0]);
    assert.equal(nubank.limite_utilizado, 361.3);
    assert.equal(nubank.limite_disponivel, 7638.7);
  });

  test('Ana: relatório de outubro compara com setembro como no design', async () => {
    const { saidas } = await porCategoria(ids['ana@email.com'], { inicio: '2026-10-01', fim: '2026-10-31' });
    const porNome = Object.fromEntries(saidas.categorias.map((c) => [c.nome, [c.total, c.totalAnterior]]));
    assert.deepEqual(porNome.Moradia, [1500, 1500]);
    assert.deepEqual(porNome['Alimentação'], [980.5, 870]);
    assert.deepEqual(porNome.Mobilidade, [769.5, 812.3]);
  });

  test('Bruno: caso de estresse sem cartões', async () => {
    const id = ids['bruno@email.com'];
    const { total } = await Lancamento.listar(id, NOVEMBRO);
    assert.ok(total >= 60);

    assert.equal(
      await contar(`SELECT COUNT(*)::int AS total FROM fontes_destinos WHERE usuario_id = $1 AND tipo = 'cartao_credito'`, [id]),
      0,
    );
    assert.equal(demonstracao.DESCRICAO_LONGA.length, 120);
    assert.equal(demonstracao.CATEGORIA_NOME_LONGO.length, 60);
    assert.equal(
      await contar('SELECT COUNT(*)::int AS total FROM lancamentos WHERE usuario_id = $1 AND descricao = $2', [id, demonstracao.DESCRICAO_LONGA]),
      1,
    );
    assert.equal(
      await contar('SELECT COUNT(*)::int AS total FROM lancamentos WHERE usuario_id = $1 AND valor = $2', [id, demonstracao.VALOR_ALTO]),
      1,
    );
    assert.equal(
      await contar('SELECT COUNT(*)::int AS total FROM categorias WHERE usuario_id = $1 AND nome = $2', [id, demonstracao.CATEGORIA_NOME_LONGO]),
      1,
    );
  });

  test('recusa sem apagar nada quando outra conta usa o CPF da Ana', async () => {
    await pool.query(`UPDATE usuarios SET email = 'ana.antiga@teste.com' WHERE id = $1`, [ids['ana@email.com']]);
    await assert.rejects(popular(), { code: '23505' });
    assert.equal(
      await contar('SELECT COUNT(*)::int AS total FROM lancamentos WHERE usuario_id = $1', [ids['ana@email.com']]),
      34,
    );
    await pool.query(`UPDATE usuarios SET email = 'ana@email.com' WHERE id = $1`, [ids['ana@email.com']]);
  });

  test('desloca as datas para o mês em que o seed roda, mantendo os valores do design', async () => {
    await popular('2027-02-10');
    const { totais } = await Lancamento.listar(ids['ana@email.com'], { inicio: '2027-02-01', fim: '2027-02-28', pagina: 1 });
    assert.deepEqual(totais, { entradas: 7350, saidas: 2666.64, saldo: 4683.36 });

    const visa = (await buscarFaturas(ids['ana@email.com'], { meses: 3, hoje: '2027-02-22' }))
      .find((c) => c.nome === 'Visa crédito');
    assert.deepEqual(
      visa.faturas.map((f) => [f.referencia, f.total]),
      [['03/2027', 555.34], ['04/2027', 483.33], ['05/2027', 483.33], ['06/2027', 450]],
    );
    assert.equal(visa.limite_utilizado, 3772);
  });
});

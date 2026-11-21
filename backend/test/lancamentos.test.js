import { describe, test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { subirApp } from './helpers.js';

const URL_BANCO = process.env.TEST_DATABASE_URL;
const pular = !URL_BANCO && 'defina TEST_DATABASE_URL (banco com "test" no nome) para rodar';

describe('lançamentos (integração com Postgres)', { skip: pular }, () => {
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
    const { default: rotas } = await import('../src/routes/lancamentos.routes.js');
    const { tratarErros } = await import('../src/middlewares/erros.js');

    const { readFile } = await import('node:fs/promises');
    await pool.query(await readFile(new URL('../database/schema.sql', import.meta.url), 'utf8'));

    app = await subirApp((servidor) => {
      servidor.use('/api/lancamentos', rotas);
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
    const categoria = (nome, tipo, cor) =>
      inserir('INSERT INTO categorias (usuario_id, nome, tipo, cor) VALUES ($1, $2, $3, $4) RETURNING id', [nome, tipo, cor]);
    const fonte = (nome, tipo, extra = [null, null, null]) =>
      inserir(
        `INSERT INTO fontes_destinos (usuario_id, nome, tipo, dia_fechamento, dia_vencimento, limite)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [nome, tipo, ...extra],
      );

    return {
      id: u.id,
      token,
      outros: await categoria('Outros', 'saida', 1),
      salario: await categoria('Salário', 'entrada', 2),
      conta: await fonte('Conta corrente', 'conta'),
      renda: await fonte('Salário', 'renda'),
      visa: await fonte('Visa crédito', 'cartao_credito', [25, 5, 5000]),
    };
  }

  const chamar = (usuario, metodo, caminho, corpo) =>
    fetch(`${app.url}/api/lancamentos${caminho}`, {
      method: metodo,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${usuario.token}` },
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
    }).then(async (res) => ({ status: res.status, corpo: res.status === 204 ? null : await res.json() }));

  const saida = (u, extra = {}) => ({
    tipo: 'saida',
    valor: 100,
    descricao: 'Notebook',
    data: '2026-11-17',
    categoriaId: u.outros,
    fonteDestinoId: u.visa,
    ...extra,
  });

  const contar = async (usuario) =>
    (await pool.query('SELECT COUNT(*)::int AS n FROM lancamentos WHERE usuario_id = $1', [usuario.id])).rows[0].n;

  test('exige autenticação', async () => {
    assert.equal((await fetch(`${app.url}/api/lancamentos`, { method: 'POST' })).status, 401);
  });

  test('cria lançamento simples com categoria, fonte e dados de parcela', async () => {
    const u = await novoUsuario();
    const res = await chamar(u, 'POST', '', saida(u, { valor: 59.9, descricao: '  Cinema  ', fonteDestinoId: u.conta }));

    assert.equal(res.status, 201);
    assert.equal(res.corpo.length, 1);
    assert.deepEqual(res.corpo[0], {
      id: res.corpo[0].id,
      tipo: 'saida',
      descricao: 'Cinema',
      valor: 59.9,
      data: '2026-11-17',
      parcela_atual: 1,
      total_parcelas: 1,
      grupo_parcelamento: null,
      categoria: { id: u.outros, nome: 'Outros', cor: 1 },
      fonteDestino: { id: u.conta, nome: 'Conta corrente', tipo: 'conta' },
    });
  });

  test('R$ 100,00 em 3x no cartão gera 33,34 + 33,33 + 33,33 com datas mês a mês', async () => {
    const u = await novoUsuario();
    const res = await chamar(u, 'POST', '', saida(u, { parcelas: 3 }));

    assert.equal(res.status, 201);
    assert.deepEqual(res.corpo.map((l) => l.valor), [33.34, 33.33, 33.33]);
    assert.deepEqual(res.corpo.map((l) => l.data), ['2026-11-17', '2026-12-17', '2027-01-17']);
    assert.deepEqual(res.corpo.map((l) => l.parcela_atual), [1, 2, 3]);
    assert.ok(res.corpo.every((l) => l.total_parcelas === 3));

    const [grupo] = new Set(res.corpo.map((l) => l.grupo_parcelamento));
    assert.match(grupo, /^[0-9a-f-]{36}$/);
    assert.ok(res.corpo.every((l) => l.grupo_parcelamento === grupo));
  });

  test('parcela de compra no dia 31 cai no último dia dos meses mais curtos', async () => {
    const u = await novoUsuario();
    const res = await chamar(u, 'POST', '', saida(u, { data: '2027-01-31', parcelas: 3 }));
    assert.deepEqual(res.corpo.map((l) => l.data), ['2027-01-31', '2027-02-28', '2027-03-31']);
  });

  test('todas as parcelas são gravadas ou nenhuma (transação)', async () => {
    const u = await novoUsuario();
    await pool.query(`
      CREATE FUNCTION falhar_terceira_parcela() RETURNS trigger AS $$
      BEGIN
        IF NEW.parcela_atual = 3 THEN RAISE EXCEPTION 'falha simulada'; END IF;
        RETURN NEW;
      END $$ LANGUAGE plpgsql;
      CREATE TRIGGER falhar_terceira_parcela BEFORE INSERT ON lancamentos
        FOR EACH ROW EXECUTE FUNCTION falhar_terceira_parcela();
    `);
    const erroOriginal = console.error;
    console.error = () => {};
    try {
      const res = await chamar(u, 'POST', '', saida(u, { parcelas: 5 }));
      assert.equal(res.status, 500);
      assert.equal(await contar(u), 0);
    } finally {
      console.error = erroOriginal;
      await pool.query(`
        DROP TRIGGER falhar_terceira_parcela ON lancamentos;
        DROP FUNCTION falhar_terceira_parcela();
      `);
    }
  });

  test('saída com categoria de entrada devolve 400 com a mensagem do design', async () => {
    const u = await novoUsuario();
    const res = await chamar(u, 'POST', '', saida(u, { categoriaId: u.salario }));

    assert.equal(res.status, 400);
    assert.deepEqual(res.corpo, {
      erro: 'Dados inválidos.',
      campos: { categoriaId: 'A categoria informada é de entrada, mas o lançamento é de saída.' },
    });

    const entrada = await chamar(u, 'POST', '', saida(u, { tipo: 'entrada', fonteDestinoId: u.renda }));
    assert.equal(entrada.corpo.campos.categoriaId, 'A categoria informada é de saída, mas o lançamento é de entrada.');
    assert.equal(await contar(u), 0);
  });

  test('valor zero, negativo ou ausente devolve 400 em campos.valor', async () => {
    const u = await novoUsuario();
    for (const valor of [0, -10, undefined, 'abc', null]) {
      const res = await chamar(u, 'POST', '', saida(u, { valor }));
      assert.equal(res.status, 400, String(valor));
      assert.deepEqual(res.corpo.campos, { valor: 'O valor deve ser maior que zero.' }, String(valor));
    }
    assert.ok((await chamar(u, 'POST', '', saida(u, { valor: 10.123 }))).corpo.campos.valor);
    assert.ok((await chamar(u, 'POST', '', saida(u, { valor: 1e12 }))).corpo.campos.valor);
  });

  test('erros do design aparecem juntos: valor e categoriaId', async () => {
    const u = await novoUsuario();
    const res = await chamar(u, 'POST', '', saida(u, { valor: 0, categoriaId: u.salario }));
    assert.equal(res.status, 400);
    assert.deepEqual(res.corpo.campos, {
      valor: 'O valor deve ser maior que zero.',
      categoriaId: 'A categoria informada é de entrada, mas o lançamento é de saída.',
    });
  });

  test('demais campos inválidos devolvem 400 por campo', async () => {
    const u = await novoUsuario();
    const vazio = await chamar(u, 'POST', '', {});
    assert.deepEqual(
      Object.keys(vazio.corpo.campos).sort(),
      ['categoriaId', 'data', 'descricao', 'fonteDestinoId', 'tipo', 'valor'],
    );

    const casos = [
      [{ tipo: 'transferencia' }, 'tipo'],
      [{ descricao: '   ' }, 'descricao'],
      [{ descricao: 'a'.repeat(121) }, 'descricao'],
      [{ data: '2026-02-30' }, 'data'],
      [{ data: '17/11/2026' }, 'data'],
      [{ data: '0000-01-01' }, 'data'],
      [{ categoriaId: 'abc' }, 'categoriaId'],
      [{ fonteDestinoId: 0 }, 'fonteDestinoId'],
      [{ parcelas: 0 }, 'parcelas'],
      [{ parcelas: 49 }, 'parcelas'],
      [{ parcelas: 2.5 }, 'parcelas'],
      [{ parcelas: '3' }, 'parcelas'],
    ];
    for (const [extra, campo] of casos) {
      const res = await chamar(u, 'POST', '', saida(u, extra));
      assert.equal(res.status, 400, JSON.stringify(extra));
      assert.deepEqual(Object.keys(res.corpo.campos), [campo], JSON.stringify(extra));
    }

    assert.equal((await chamar(u, 'POST', '', saida(u, { parcelas: 48 }))).status, 201);
  });

  test('parcelamento só é aceito em cartão de crédito', async () => {
    const u = await novoUsuario();
    const res = await chamar(u, 'POST', '', saida(u, { fonteDestinoId: u.conta, parcelas: 3 }));
    assert.equal(res.status, 400);
    assert.deepEqual(res.corpo.campos, { parcelas: 'O parcelamento só está disponível para cartão de crédito.' });
    assert.equal((await chamar(u, 'POST', '', saida(u, { fonteDestinoId: u.conta, parcelas: 1 }))).status, 201);
  });

  test('valor menor que um centavo por parcela devolve 400', async () => {
    const u = await novoUsuario();
    const res = await chamar(u, 'POST', '', saida(u, { valor: 0.02, parcelas: 3 }));
    assert.equal(res.status, 400);
    assert.ok(res.corpo.campos.parcelas);
  });

  test('categoria ou fonte de outro usuário é rejeitada', async () => {
    const dono = await novoUsuario();
    const intruso = await novoUsuario();

    const res = await chamar(intruso, 'POST', '', saida(intruso, { categoriaId: dono.outros, fonteDestinoId: dono.visa }));
    assert.equal(res.status, 400);
    assert.deepEqual(res.corpo.campos, {
      categoriaId: 'Categoria não encontrada.',
      fonteDestinoId: 'Fonte ou destino não encontrado.',
    });
    assert.equal(await contar(intruso), 0);
  });

  test('PUT edita uma parcela com as mesmas validações e mantém os dados do parcelamento', async () => {
    const u = await novoUsuario();
    const { corpo: parcelas } = await chamar(u, 'POST', '', saida(u, { parcelas: 3 }));
    const segunda = parcelas[1];

    const editado = await chamar(u, 'PUT', `/${segunda.id}`, saida(u, { valor: 40, descricao: 'Notebook Dell', data: '2026-12-20' }));
    assert.equal(editado.status, 200);
    assert.equal(editado.corpo.valor, 40);
    assert.equal(editado.corpo.descricao, 'Notebook Dell');
    assert.equal(editado.corpo.data, '2026-12-20');
    assert.equal(editado.corpo.parcela_atual, 2);
    assert.equal(editado.corpo.total_parcelas, 3);
    assert.equal(editado.corpo.grupo_parcelamento, segunda.grupo_parcelamento);

    const tipoErrado = await chamar(u, 'PUT', `/${segunda.id}`, saida(u, { categoriaId: u.salario }));
    assert.equal(tipoErrado.status, 400);
    assert.ok(tipoErrado.corpo.campos.categoriaId);

    const semCartao = await chamar(u, 'PUT', `/${segunda.id}`, saida(u, { fonteDestinoId: u.conta }));
    assert.deepEqual(Object.keys(semCartao.corpo.campos), ['parcelas']);

    const outroTotal = await chamar(u, 'PUT', `/${segunda.id}`, saida(u, { parcelas: 5 }));
    assert.deepEqual(Object.keys(outroTotal.corpo.campos), ['parcelas']);

    assert.equal((await chamar(u, 'PUT', `/${segunda.id}`, saida(u, { parcelas: 3 }))).status, 200);
  });

  test('PATCH altera só os campos enviados e valida o resultado', async () => {
    const u = await novoUsuario();
    const { corpo: [lancamento] } = await chamar(u, 'POST', '', saida(u, { fonteDestinoId: u.conta }));

    const res = await chamar(u, 'PATCH', `/${lancamento.id}`, { descricao: 'Mercado' });
    assert.equal(res.status, 200);
    assert.equal(res.corpo.descricao, 'Mercado');
    assert.equal(res.corpo.valor, 100);
    assert.equal(res.corpo.categoria.id, u.outros);

    const tipoErrado = await chamar(u, 'PATCH', `/${lancamento.id}`, { tipo: 'entrada' });
    assert.equal(tipoErrado.status, 400);
    assert.equal(tipoErrado.corpo.campos.categoriaId, 'A categoria informada é de saída, mas o lançamento é de entrada.');

    const valorZero = await chamar(u, 'PATCH', `/${lancamento.id}`, { valor: 0 });
    assert.deepEqual(valorZero.corpo.campos, { valor: 'O valor deve ser maior que zero.' });

    const entrada = await chamar(u, 'PATCH', `/${lancamento.id}`, { tipo: 'entrada', categoriaId: u.salario, fonteDestinoId: u.renda });
    assert.equal(entrada.status, 200);
    assert.equal(entrada.corpo.tipo, 'entrada');
  });

  test('DELETE remove só a parcela ou todas com ?todasParcelas=true', async () => {
    const u = await novoUsuario();
    const { corpo: compra } = await chamar(u, 'POST', '', saida(u, { parcelas: 3 }));
    const { corpo: outra } = await chamar(u, 'POST', '', saida(u, { parcelas: 2 }));

    assert.equal((await chamar(u, 'DELETE', `/${compra[0].id}`)).status, 204);
    assert.equal(await contar(u), 4);

    assert.equal((await chamar(u, 'DELETE', `/${compra[1].id}?todasParcelas=true`)).status, 204);
    assert.equal(await contar(u), 2);

    const { rows } = await pool.query('SELECT id FROM lancamentos WHERE usuario_id = $1 ORDER BY id', [u.id]);
    assert.deepEqual(rows.map((r) => r.id), outra.map((l) => l.id));

    assert.equal((await chamar(u, 'DELETE', `/${outra[0].id}?todasParcelas=talvez`)).status, 400);
  });

  test('DELETE com todasParcelas em lançamento simples remove só ele', async () => {
    const u = await novoUsuario();
    const { corpo: [simples] } = await chamar(u, 'POST', '', saida(u, { fonteDestinoId: u.conta }));
    await chamar(u, 'POST', '', saida(u, { fonteDestinoId: u.conta }));

    assert.equal((await chamar(u, 'DELETE', `/${simples.id}?todasParcelas=true`)).status, 204);
    assert.equal(await contar(u), 1);
  });

  test('lançamento de outro usuário devolve 404 em PUT, PATCH e DELETE', async () => {
    const dono = await novoUsuario();
    const intruso = await novoUsuario();
    const { corpo: [lancamento] } = await chamar(dono, 'POST', '', saida(dono, { parcelas: 2 }));

    assert.equal((await chamar(intruso, 'PUT', `/${lancamento.id}`, saida(intruso))).status, 404);
    assert.equal((await chamar(intruso, 'PATCH', `/${lancamento.id}`, { descricao: 'X' })).status, 404);
    assert.equal((await chamar(intruso, 'DELETE', `/${lancamento.id}?todasParcelas=true`)).status, 404);
    assert.equal(await contar(dono), 2);
  });

  test('ids inexistentes ou malformados devolvem 404', async () => {
    const u = await novoUsuario();
    for (const id of ['999999', 'abc', '0', '99999999999999']) {
      assert.equal((await chamar(u, 'DELETE', `/${id}`)).status, 404, `DELETE /${id}`);
      assert.equal((await chamar(u, 'PUT', `/${id}`, saida(u))).status, 404, `PUT /${id}`);
      assert.equal((await chamar(u, 'PATCH', `/${id}`, {})).status, 404, `PATCH /${id}`);
    }
  });
  async function lancar(u, dados) {
    const { status, corpo } = await chamar(u, 'POST', '', saida(u, dados));
    assert.equal(status, 201);
    return corpo;
  }

  const listar = (u, consulta = '') => chamar(u, 'GET', consulta ? `?${consulta}` : '');

  test('GET exige autenticação', async () => {
    assert.equal((await fetch(`${app.url}/api/lancamentos`)).status, 401);
    assert.equal((await fetch(`${app.url}/api/lancamentos/1`)).status, 401);
  });

  test('lista o período com itens completos, ordem por data e totais via SUM', async () => {
    const u = await novoUsuario();
    await lancar(u, { tipo: 'entrada', valor: 6800, descricao: 'Salário', data: '2026-11-05', categoriaId: u.salario, fonteDestinoId: u.renda });
    await lancar(u, { valor: 1500, descricao: 'Aluguel', data: '2026-11-05', fonteDestinoId: u.conta });
    await lancar(u, { valor: 100, descricao: 'Cabo e carregador', data: '2026-11-15', parcelas: 3 });
    await lancar(u, { valor: 72, descricao: 'Cinema', data: '2026-10-31', fonteDestinoId: u.conta });

    const res = await listar(u, 'inicio=2026-11-01&fim=2026-11-30');

    assert.equal(res.status, 200);
    assert.deepEqual(res.corpo.itens.map((l) => l.descricao), ['Cabo e carregador', 'Aluguel', 'Salário']);
    assert.deepEqual(
      { total: res.corpo.total, pagina: res.corpo.pagina, totalPaginas: res.corpo.totalPaginas },
      { total: 3, pagina: 1, totalPaginas: 1 },
    );
    assert.deepEqual(res.corpo.totais, { entradas: 6800, saidas: 1533.34, saldo: 5266.66 });

    const [parcela] = res.corpo.itens;
    assert.equal(parcela.parcela_atual, 1);
    assert.equal(parcela.total_parcelas, 3);
    assert.deepEqual(parcela.categoria, { id: u.outros, nome: 'Outros', cor: 1 });
    assert.deepEqual(parcela.fonteDestino, { id: u.visa, nome: 'Visa crédito', tipo: 'cartao_credito' });
  });

  test('sem datas usa o mês corrente', async () => {
    const u = await novoUsuario();
    const hoje = new Date();
    const dia = (d) => new Date(Date.UTC(hoje.getFullYear(), hoje.getMonth(), d)).toISOString().slice(0, 10);
    await lancar(u, { descricao: 'Neste mês', data: dia(1), fonteDestinoId: u.conta });
    await lancar(u, { descricao: 'Mês passado', data: dia(0), fonteDestinoId: u.conta });

    const res = await listar(u);
    assert.equal(res.status, 200);
    assert.deepEqual(res.corpo.itens.map((l) => l.descricao), ['Neste mês']);
  });

  test('filtros de tipo, categoria e fonte/destino se combinam e refletem nos totais', async () => {
    const u = await novoUsuario();
    const lazer = (await pool.query(
      `INSERT INTO categorias (usuario_id, nome, tipo, cor) VALUES ($1, 'Lazer', 'saida', 3) RETURNING id`,
      [u.id],
    )).rows[0].id;
    await lancar(u, { tipo: 'entrada', valor: 550, descricao: 'Logo', data: '2026-11-12', categoriaId: u.salario, fonteDestinoId: u.conta });
    await lancar(u, { valor: 72, descricao: 'Cinema', data: '2026-11-10', categoriaId: lazer });
    await lancar(u, { valor: 250, descricao: 'Consulta', data: '2026-11-09', fonteDestinoId: u.conta });
    await lancar(u, { valor: 30, descricao: 'Pipoca', data: '2026-11-10', categoriaId: lazer, fonteDestinoId: u.conta });

    const periodo = 'inicio=2026-11-01&fim=2026-11-30';
    const saidas = await listar(u, `${periodo}&tipo=saida`);
    assert.equal(saidas.corpo.total, 3);
    assert.deepEqual(saidas.corpo.totais, { entradas: 0, saidas: 352, saldo: -352 });

    const combinado = await listar(u, `${periodo}&tipo=saida&categoriaId=${lazer}&fonteDestinoId=${u.visa}`);
    assert.deepEqual(combinado.corpo.itens.map((l) => l.descricao), ['Cinema']);
    assert.deepEqual(combinado.corpo.totais, { entradas: 0, saidas: 72, saldo: -72 });

    const naConta = await listar(u, `${periodo}&fonteDestinoId=${u.conta}`);
    assert.equal(naConta.corpo.total, 3);
    assert.deepEqual(naConta.corpo.totais, { entradas: 550, saidas: 280, saldo: 270 });
  });

  test('pagina de 20 em 20 com total e total de páginas', async () => {
    const u = await novoUsuario();
    await pool.query(
      `INSERT INTO lancamentos (usuario_id, tipo, descricao, valor, data, categoria_id, fonte_destino_id)
       SELECT $1, 'saida', 'Item ' || n, 10, DATE '2026-11-01' + (n % 30), $2, $3 FROM generate_series(1, 45) AS n`,
      [u.id, u.outros, u.conta],
    );
    const periodo = 'inicio=2026-11-01&fim=2026-11-30';

    const primeira = await listar(u, periodo);
    assert.equal(primeira.corpo.itens.length, 20);
    assert.deepEqual([primeira.corpo.total, primeira.corpo.totalPaginas], [45, 3]);
    assert.equal(primeira.corpo.totais.saidas, 450);

    const ultima = await listar(u, `${periodo}&pagina=3`);
    assert.equal(ultima.corpo.itens.length, 5);
    assert.equal(ultima.corpo.pagina, 3);
    assert.equal(ultima.corpo.totais.saidas, 450);

    const ids = new Set();
    for (const pagina of [1, 2, 3]) {
      (await listar(u, `${periodo}&pagina=${pagina}`)).corpo.itens.forEach((l) => ids.add(l.id));
    }
    assert.equal(ids.size, 45);

    const alem = await listar(u, `${periodo}&pagina=9`);
    assert.equal(alem.status, 200);
    assert.deepEqual(alem.corpo.itens, []);
    assert.equal(alem.corpo.total, 45);
  });

  test('período sem lançamentos devolve lista vazia e totais zerados', async () => {
    const u = await novoUsuario();
    const res = await listar(u, 'inicio=2026-01-01&fim=2026-01-31');
    assert.equal(res.status, 200);
    assert.deepEqual(res.corpo, {
      itens: [], total: 0, pagina: 1, totalPaginas: 0,
      totais: { entradas: 0, saidas: 0, saldo: 0 },
    });
  });

  test('filtros inválidos devolvem 400 por campo', async () => {
    const u = await novoUsuario();
    const casos = [
      ['inicio=2026-02-30', 'inicio'],
      ['inicio=01/11/2026&fim=2026-11-30', 'inicio'],
      ['inicio=2026-11-01&fim=amanha', 'fim'],
      ['inicio=2026-11-30&fim=2026-11-01', 'fim'],
      ['tipo=transferencia', 'tipo'],
      ['categoriaId=abc', 'categoriaId'],
      ['fonteDestinoId=-1', 'fonteDestinoId'],
      ['pagina=0', 'pagina'],
      ['pagina=1.5', 'pagina'],
      ['tipo=saida&tipo=entrada', 'tipo'],
    ];
    for (const [consulta, campo] of casos) {
      const res = await listar(u, consulta);
      assert.equal(res.status, 400, consulta);
      assert.equal(res.corpo.erro, 'Dados inválidos.', consulta);
      assert.ok(res.corpo.campos[campo], `${consulta} → campos.${campo}`);
    }
  });

  test('a listagem não mostra lançamentos de outro usuário', async () => {
    const dono = await novoUsuario();
    const outro = await novoUsuario();
    await lancar(dono, { data: '2026-11-10' });

    const res = await listar(outro, `inicio=2026-11-01&fim=2026-11-30&categoriaId=${dono.outros}`);
    assert.equal(res.corpo.total, 0);
    assert.deepEqual(res.corpo.totais, { entradas: 0, saidas: 0, saldo: 0 });
  });

  test('GET /:id devolve o lançamento do usuário e 404 para o de outro', async () => {
    const dono = await novoUsuario();
    const intruso = await novoUsuario();
    const [lancamento] = await lancar(dono, { parcelas: 2 });

    const res = await chamar(dono, 'GET', `/${lancamento.id}`);
    assert.equal(res.status, 200);
    assert.deepEqual(res.corpo, lancamento);

    assert.deepEqual(await chamar(intruso, 'GET', `/${lancamento.id}`), { status: 404, corpo: { erro: 'Lançamento não encontrado.' } });
    for (const id of ['999999', 'abc', '0']) {
      assert.equal((await chamar(dono, 'GET', `/${id}`)).status, 404, `GET /${id}`);
    }
  });
});

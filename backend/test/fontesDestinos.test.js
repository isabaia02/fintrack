import { describe, test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { subirApp } from './helpers.js';

// Teste de integração (mesmo banco de teste das categorias; ver README):
//   TEST_DATABASE_URL=postgresql://localhost:5432/fintrack_test npm test
const URL_BANCO = process.env.TEST_DATABASE_URL;
const pular = !URL_BANCO && 'defina TEST_DATABASE_URL (banco com "test" no nome) para rodar';

describe('fontes e destinos (integração com Postgres)', { skip: pular }, () => {
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
    const { default: rotas } = await import('../src/routes/fontesDestinos.routes.js');
    const { tratarErros } = await import('../src/middlewares/erros.js');

    const { readFile } = await import('node:fs/promises');
    await pool.query(await readFile(new URL('../database/schema.sql', import.meta.url), 'utf8'));

    app = await subirApp((servidor) => {
      servidor.use('/api/fontes-destinos', rotas);
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
    return { id: u.id, token };
  }

  const chamar = (usuario, metodo, caminho, corpo) =>
    fetch(`${app.url}/api/fontes-destinos${caminho}`, {
      method: metodo,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${usuario.token}` },
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
    }).then(async (res) => ({ status: res.status, corpo: res.status === 204 ? null : await res.json() }));

  const cartao = (nome, extra = {}) => ({
    nome, tipo: 'cartao_credito', dia_fechamento: 3, dia_vencimento: 10, limite: 5000, ...extra,
  });

  async function categoriaELancamentos(usuario, fonteId, vezes) {
    const { rows: [categoria] } = await pool.query(
      `INSERT INTO categorias (usuario_id, nome, tipo, cor) VALUES ($1, 'Geral', 'saida', 1) RETURNING id`,
      [usuario.id],
    );
    for (let i = 0; i < vezes; i += 1) {
      await pool.query(
        `INSERT INTO lancamentos (usuario_id, tipo, descricao, valor, data, categoria_id, fonte_destino_id)
         VALUES ($1, 'saida', 'Teste', 10, '2026-01-15', $2, $3)`,
        [usuario.id, categoria.id, fonteId],
      );
    }
  }

  test('exige autenticação', async () => {
    assert.equal((await fetch(`${app.url}/api/fontes-destinos`)).status, 401);
  });

  test('cria renda, conta (com reserva) e cartão; limite volta como número', async () => {
    const u = await novoUsuario();

    const renda = await chamar(u, 'POST', '', { nome: 'Salário', tipo: 'renda' });
    assert.equal(renda.status, 201);
    assert.deepEqual(renda.corpo, {
      id: renda.corpo.id, nome: 'Salário', tipo: 'renda', dia_fechamento: null, dia_vencimento: null,
      limite: null, reserva: false, total_lancamentos: 0,
    });

    const conta = await chamar(u, 'POST', '', { nome: 'Poupança', tipo: 'conta', reserva: true });
    assert.equal(conta.status, 201);
    assert.equal(conta.corpo.reserva, true);

    const novoCartao = await chamar(u, 'POST', '', cartao('Nubank', { limite: 5234.5 }));
    assert.equal(novoCartao.status, 201);
    assert.equal(novoCartao.corpo.limite, 5234.5);
    assert.equal(novoCartao.corpo.dia_fechamento, 3);
    assert.equal(novoCartao.corpo.dia_vencimento, 10);
  });

  test('fora de cartão, dia/limite são descartados e reserva só vale para conta', async () => {
    const u = await novoUsuario();
    const renda = await chamar(u, 'POST', '', {
      nome: 'Freela', tipo: 'renda', dia_fechamento: 5, dia_vencimento: 6, limite: 100, reserva: true,
    });
    assert.equal(renda.status, 201);
    assert.equal(renda.corpo.dia_fechamento, null);
    assert.equal(renda.corpo.limite, null);
    assert.equal(renda.corpo.reserva, false);
  });

  test('cartão sem dia_fechamento, dia_vencimento e limite devolve 400 por campo', async () => {
    const u = await novoUsuario();
    const res = await chamar(u, 'POST', '', { nome: 'Visa', tipo: 'cartao_credito' });
    assert.equal(res.status, 400);
    assert.equal(res.corpo.erro, 'Dados inválidos.');
    assert.deepEqual(Object.keys(res.corpo.campos).sort(), ['dia_fechamento', 'dia_vencimento', 'limite']);
  });

  test('valores inválidos de cartão devolvem 400 apenas no campo errado', async () => {
    const u = await novoUsuario();
    const casos = [
      [{ dia_fechamento: 0 }, 'dia_fechamento'],
      [{ dia_fechamento: 32 }, 'dia_fechamento'],
      [{ dia_fechamento: 1.5 }, 'dia_fechamento'],
      [{ dia_fechamento: '10' }, 'dia_fechamento'],
      [{ dia_vencimento: 0 }, 'dia_vencimento'],
      [{ dia_vencimento: 40 }, 'dia_vencimento'],
      [{ limite: 0 }, 'limite'],
      [{ limite: -10 }, 'limite'],
      [{ limite: 'abc' }, 'limite'],
      [{ limite: 10.123 }, 'limite'],
      [{ limite: 1e12 }, 'limite'],
    ];
    for (const [extra, campo] of casos) {
      const res = await chamar(u, 'POST', '', cartao('Cartão', extra));
      assert.equal(res.status, 400, JSON.stringify(extra));
      assert.deepEqual(Object.keys(res.corpo.campos), [campo], JSON.stringify(extra));
    }

    assert.equal((await chamar(u, 'POST', '', cartao('Borda A', { dia_fechamento: 1, dia_vencimento: 31, limite: 0.01 }))).status, 201);
  });

  test('nome, tipo e reserva inválidos devolvem 400', async () => {
    const u = await novoUsuario();
    const vazio = await chamar(u, 'POST', '', {});
    assert.equal(vazio.status, 400);
    assert.deepEqual(Object.keys(vazio.corpo.campos).sort(), ['nome', 'tipo']);

    assert.ok((await chamar(u, 'POST', '', { nome: 'a'.repeat(61), tipo: 'conta' })).corpo.campos.nome);
    assert.ok((await chamar(u, 'POST', '', { nome: 'X', tipo: 'poupanca' })).corpo.campos.tipo);
    assert.ok((await chamar(u, 'POST', '', { nome: 'X', tipo: 'conta', reserva: 'sim' })).corpo.campos.reserva);
  });

  test('GET agrupa na ordem renda · conta · cartão, devolve total_lancamentos e filtra por tipo', async () => {
    const u = await novoUsuario();
    await chamar(u, 'POST', '', cartao('Nubank'));
    const { corpo: conta } = await chamar(u, 'POST', '', { nome: 'Conta corrente', tipo: 'conta' });
    await chamar(u, 'POST', '', { nome: 'Salário', tipo: 'renda' });
    await chamar(u, 'POST', '', { nome: 'Bônus', tipo: 'renda' });
    await categoriaELancamentos(u, conta.id, 4);

    const lista = (await chamar(u, 'GET', '')).corpo;
    assert.deepEqual(lista.map((f) => f.nome), ['Bônus', 'Salário', 'Conta corrente', 'Nubank']);
    assert.equal(lista.find((f) => f.nome === 'Conta corrente').total_lancamentos, 4);
    assert.equal(lista.find((f) => f.nome === 'Nubank').total_lancamentos, 0);

    const cartoes = (await chamar(u, 'GET', '?tipo=cartao_credito')).corpo;
    assert.deepEqual(cartoes.map((f) => f.nome), ['Nubank']);
    assert.equal((await chamar(u, 'GET', '?tipo=x')).status, 400);
  });

  test('nome duplicado no mesmo tipo devolve 409 (mesmo com caixa diferente); tipos diferentes podem repetir', async () => {
    const u = await novoUsuario();
    const outro = await novoUsuario();
    await chamar(u, 'POST', '', { nome: 'Nubank', tipo: 'conta' });

    const igual = await chamar(u, 'POST', '', { nome: '  nubank ', tipo: 'conta' });
    assert.equal(igual.status, 409);
    assert.equal(igual.corpo.campos.nome, 'Já existe uma fonte ou destino com este nome neste tipo.');

    assert.equal((await chamar(u, 'POST', '', cartao('Nubank'))).status, 201, 'cartão pode ter o nome de uma conta');
    assert.equal((await chamar(u, 'POST', '', cartao('NUBANK'))).status, 409, 'mas não de outro cartão');
    assert.equal((await chamar(outro, 'POST', '', cartao('Nubank'))).status, 201, 'outro usuário pode repetir');

    const { corpo: extra } = await chamar(u, 'POST', '', { nome: 'Extra', tipo: 'conta' });
    assert.equal((await chamar(u, 'PUT', `/${extra.id}`, { nome: 'NUBANK', tipo: 'conta' })).status, 409);
    assert.equal((await chamar(u, 'PUT', `/${extra.id}`, { nome: 'extra', tipo: 'conta' })).status, 200, 'manter o próprio nome');
    assert.equal((await chamar(u, 'PUT', `/${extra.id}`, cartao('Nubank'))).status, 409, 'mudar de tipo também respeita o nome');
  });

  test('PUT atualiza o item; cartão incompleto devolve 400; virar conta limpa os campos de cartão', async () => {
    const u = await novoUsuario();
    const { corpo: item } = await chamar(u, 'POST', '', cartao('Visa'));

    const editado = await chamar(u, 'PUT', `/${item.id}`, cartao('Visa Gold', { dia_fechamento: 20, limite: 8000 }));
    assert.equal(editado.status, 200);
    assert.equal(editado.corpo.nome, 'Visa Gold');
    assert.equal(editado.corpo.dia_fechamento, 20);
    assert.equal(editado.corpo.limite, 8000);

    const incompleto = await chamar(u, 'PUT', `/${item.id}`, { nome: 'Visa Gold', tipo: 'cartao_credito' });
    assert.equal(incompleto.status, 400);
    assert.deepEqual(Object.keys(incompleto.corpo.campos).sort(), ['dia_fechamento', 'dia_vencimento', 'limite']);

    const virouConta = await chamar(u, 'PUT', `/${item.id}`, { nome: 'Visa Gold', tipo: 'conta', reserva: true });
    assert.equal(virouConta.status, 200);
    assert.equal(virouConta.corpo.dia_fechamento, null);
    assert.equal(virouConta.corpo.limite, null);
    assert.equal(virouConta.corpo.reserva, true);
  });

  test('o tipo fica travado enquanto o item tem lançamentos, mas renomear é permitido', async () => {
    const u = await novoUsuario();
    const { corpo: conta } = await chamar(u, 'POST', '', { nome: 'Conta', tipo: 'conta' });
    await categoriaELancamentos(u, conta.id, 2);

    const bloqueado = await chamar(u, 'PUT', `/${conta.id}`, cartao('Conta'));
    assert.equal(bloqueado.status, 409);
    assert.ok(bloqueado.corpo.campos.tipo);

    const renomeado = await chamar(u, 'PUT', `/${conta.id}`, { nome: 'Conta principal', tipo: 'conta', reserva: true });
    assert.equal(renomeado.status, 200);
    assert.equal(renomeado.corpo.total_lancamentos, 2);
  });

  test('fechamento e vencimento ficam travados com lançamentos; nome e limite continuam editáveis', async () => {
    const u = await novoUsuario();
    const { corpo: item } = await chamar(u, 'POST', '', cartao('Nubank'));
    await categoriaELancamentos(u, item.id, 2);

    const fechamento = await chamar(u, 'PUT', `/${item.id}`, cartao('Nubank', { dia_fechamento: 10 }));
    assert.equal(fechamento.status, 409);
    assert.deepEqual(Object.keys(fechamento.corpo.campos), ['dia_fechamento']);

    const vencimento = await chamar(u, 'PUT', `/${item.id}`, cartao('Nubank', { dia_vencimento: 15 }));
    assert.equal(vencimento.status, 409);
    assert.deepEqual(Object.keys(vencimento.corpo.campos), ['dia_vencimento']);

    const ambos = await chamar(u, 'PUT', `/${item.id}`, cartao('Nubank', { dia_fechamento: 10, dia_vencimento: 15 }));
    assert.deepEqual(Object.keys(ambos.corpo.campos).sort(), ['dia_fechamento', 'dia_vencimento']);

    const editado = await chamar(u, 'PUT', `/${item.id}`, cartao('Nubank Ultravioleta', { limite: 9000 }));
    assert.equal(editado.status, 200);
    assert.equal(editado.corpo.limite, 9000);
    assert.equal(editado.corpo.dia_fechamento, 3);
    assert.equal(editado.corpo.dia_vencimento, 10);
  });

  test('excluir item com lançamentos devolve 409 com a quantidade e não apaga', async () => {
    const u = await novoUsuario();
    const { corpo: conta } = await chamar(u, 'POST', '', { nome: 'Conta', tipo: 'conta' });
    await categoriaELancamentos(u, conta.id, 3);

    const res = await chamar(u, 'DELETE', `/${conta.id}`);
    assert.equal(res.status, 409);
    assert.equal(
      res.corpo.erro,
      'Este item tem 3 lançamentos vinculados. Edite ou exclua esses lançamentos antes de excluir.',
    );
    assert.equal((await chamar(u, 'GET', '')).corpo.length, 1);
  });

  test('a mensagem do 409 de exclusão usa o singular com 1 lançamento', async () => {
    const u = await novoUsuario();
    const { corpo: conta } = await chamar(u, 'POST', '', { nome: 'Conta', tipo: 'conta' });
    await categoriaELancamentos(u, conta.id, 1);

    const res = await chamar(u, 'DELETE', `/${conta.id}`);
    assert.equal(res.corpo.erro, 'Este item tem 1 lançamento vinculado. Edite ou exclua esses lançamentos antes de excluir.');
  });

  test('excluir item sem lançamentos devolve 204 e ele some da listagem', async () => {
    const u = await novoUsuario();
    const { corpo: item } = await chamar(u, 'POST', '', cartao('Visa'));

    assert.equal((await chamar(u, 'DELETE', `/${item.id}`)).status, 204);
    assert.deepEqual((await chamar(u, 'GET', '')).corpo, []);
  });

  test('item de outro usuário devolve 404 em PUT e DELETE e não aparece no GET', async () => {
    const dono = await novoUsuario();
    const intruso = await novoUsuario();
    const { corpo: item } = await chamar(dono, 'POST', '', cartao('Visa'));

    assert.equal((await chamar(intruso, 'PUT', `/${item.id}`, cartao('Invadido'))).status, 404);
    assert.equal((await chamar(intruso, 'DELETE', `/${item.id}`)).status, 404);
    assert.deepEqual((await chamar(intruso, 'GET', '')).corpo, []);
    assert.equal((await chamar(dono, 'GET', '')).corpo[0].nome, 'Visa');
  });

  test('ids inexistentes ou malformados devolvem 404', async () => {
    const u = await novoUsuario();
    for (const id of ['999999', 'abc', '0', '99999999999999']) {
      assert.equal((await chamar(u, 'DELETE', `/${id}`)).status, 404, `DELETE /${id}`);
      assert.equal((await chamar(u, 'PUT', `/${id}`, { nome: 'X', tipo: 'conta' })).status, 404, `PUT /${id}`);
    }
  });
});

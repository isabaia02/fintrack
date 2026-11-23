import { describe, test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Checklist de segurança (BE-10) com Postgres (mesmo banco de teste das demais rotas; ver README):
//   TEST_DATABASE_URL=postgresql://localhost:5432/fintrack_test npm test
const URL_BANCO = process.env.TEST_DATABASE_URL;
const pular = !URL_BANCO && 'defina TEST_DATABASE_URL (banco com "test" no nome) para rodar';

describe('isolamento entre usuários, vazamentos e injeção (integração com Postgres)', { skip: pular }, () => {
  let pool;
  let servidor;
  let url;
  let a;
  let b;
  const todasAsRespostas = [];

  before(async () => {
    assert.match(new URL(URL_BANCO).pathname, /test/i, 'TEST_DATABASE_URL deve apontar para um banco de teste.');
    process.env.DATABASE_URL = URL_BANCO;
    process.env.JWT_SECRET = 'segredo-de-teste-com-mais-de-trinta-caracteres';
    process.env.CADASTRO_RATE_LIMIT_MAX = '1000';
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

  async function chamar(metodo, caminho, { token, corpo } = {}) {
    const resposta = await fetch(`${url}${caminho}`, {
      method: metodo,
      headers: {
        ...(corpo !== undefined ? { 'content-type': 'application/json' } : {}),
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: corpo !== undefined ? JSON.stringify(corpo) : undefined,
    });
    const texto = await resposta.text();
    todasAsRespostas.push({ metodo, caminho, status: resposta.status, texto });
    return { status: resposta.status, corpo: texto ? JSON.parse(texto) : null };
  }

  async function novoUsuario(nome, email, cpf) {
    const cadastro = await chamar('POST', '/api/auth/cadastro', { corpo: { nome, email, cpf, senha: 'senha1234' } });
    assert.equal(cadastro.status, 201);
    const login = await chamar('POST', '/api/auth/login', { corpo: { email, senha: 'senha1234' } });
    const { token } = login.corpo;
    const categorias = (await chamar('GET', '/api/categorias?tipo=saida', { token })).corpo;
    const fontes = (await chamar('GET', '/api/fontes-destinos?tipo=conta', { token })).corpo;
    const lancamento = (await chamar('POST', '/api/lancamentos', {
      token,
      corpo: { tipo: 'saida', valor: 50, descricao: `Compra de ${nome}`, data: '2026-11-10', categoriaId: categorias[0].id, fonteDestinoId: fontes[0].id },
    })).corpo[0];
    return { token, categoria: categorias[0], fonte: fontes[0], lancamento };
  }

  beforeEach(async () => {
    await pool.query('TRUNCATE usuarios RESTART IDENTITY CASCADE');
    todasAsRespostas.length = 0;
    a = await novoUsuario('Ana', 'ana@teste.com', '52998224725');
    b = await novoUsuario('Bruno', 'bruno@teste.com', '11144477735');
  });

  describe('recurso de outro usuário devolve 404 em todas as rotas com :id', () => {
    const corpoCategoria = { nome: 'Invadida', tipo: 'saida' };
    const corpoFonte = { nome: 'Invadida', tipo: 'conta' };

    test('categorias: PUT e DELETE', async () => {
      const put = await chamar('PUT', `/api/categorias/${a.categoria.id}`, { token: b.token, corpo: corpoCategoria });
      assert.equal(put.status, 404);
      assert.deepEqual(put.corpo, { erro: 'Categoria não encontrada.' });
      const del = await chamar('DELETE', `/api/categorias/${a.categoria.id}`, { token: b.token });
      assert.equal(del.status, 404);
      const dela = (await chamar('GET', '/api/categorias', { token: a.token })).corpo.find((c) => c.id === a.categoria.id);
      assert.equal(dela.nome, a.categoria.nome, 'a categoria da Ana não pode mudar');
    });

    test('fontes e destinos: PUT e DELETE', async () => {
      const put = await chamar('PUT', `/api/fontes-destinos/${a.fonte.id}`, { token: b.token, corpo: corpoFonte });
      assert.equal(put.status, 404);
      assert.deepEqual(put.corpo, { erro: 'Fonte ou destino não encontrado.' });
      assert.equal((await chamar('DELETE', `/api/fontes-destinos/${a.fonte.id}`, { token: b.token })).status, 404);
      const dela = (await chamar('GET', '/api/fontes-destinos', { token: a.token })).corpo.find((f) => f.id === a.fonte.id);
      assert.equal(dela.nome, a.fonte.nome);
    });

    test('lançamentos: GET, PUT, PATCH e DELETE (com e sem todasParcelas)', async () => {
      const id = a.lancamento.id;
      const valido = { tipo: 'saida', valor: 1, descricao: 'Invadido', data: '2026-11-11', categoriaId: b.categoria.id, fonteDestinoId: b.fonte.id };
      const resultados = await Promise.all([
        chamar('GET', `/api/lancamentos/${id}`, { token: b.token }),
        chamar('PUT', `/api/lancamentos/${id}`, { token: b.token, corpo: valido }),
        chamar('PATCH', `/api/lancamentos/${id}`, { token: b.token, corpo: { valor: 1 } }),
        chamar('DELETE', `/api/lancamentos/${id}`, { token: b.token }),
        chamar('DELETE', `/api/lancamentos/${id}?todasParcelas=true`, { token: b.token }),
      ]);
      for (const r of resultados) {
        assert.equal(r.status, 404);
        assert.deepEqual(r.corpo, { erro: 'Lançamento não encontrado.' });
      }
      const intacto = await chamar('GET', `/api/lancamentos/${id}`, { token: a.token });
      assert.equal(intacto.status, 200);
      assert.equal(intacto.corpo.valor, 50);
      assert.equal(intacto.corpo.descricao, 'Compra de Ana');
    });

    test('id inexistente ou malformado também é 404 (sem 400, sem 500)', async () => {
      for (const id of ['999999', 'abc', '0', '-1', '1.5', '99999999999999999999', '1%20OR%201=1']) {
        for (const [metodo, caminho, corpo] of [
          ['PUT', `/api/categorias/${id}`, corpoCategoria],
          ['DELETE', `/api/categorias/${id}`],
          ['PUT', `/api/fontes-destinos/${id}`, corpoFonte],
          ['DELETE', `/api/fontes-destinos/${id}`],
          ['GET', `/api/lancamentos/${id}`],
          ['PATCH', `/api/lancamentos/${id}`, {}],
          ['DELETE', `/api/lancamentos/${id}`],
        ]) {
          const r = await chamar(metodo, caminho, { token: b.token, corpo });
          assert.equal(r.status, 404, `${metodo} ${caminho}`);
        }
      }
      // corpo inválido + id malformado: continua sendo 404 (o id é checado antes do corpo)
      assert.equal((await chamar('PUT', '/api/categorias/abc', { token: b.token, corpo: {} })).status, 404);
      assert.equal((await chamar('PUT', '/api/fontes-destinos/abc', { token: b.token, corpo: {} })).status, 404);
    });

    test('listas, relatórios e saúde financeira de um usuário não trazem dados do outro', async () => {
      for (const caminho of ['/api/lancamentos?inicio=2026-01-01&fim=2026-12-31']) {
        const r = await chamar('GET', caminho, { token: b.token });
        assert.ok(r.corpo.itens.every((i) => i.descricao === 'Compra de Bruno'), caminho);
      }
      const cats = (await chamar('GET', '/api/categorias', { token: b.token })).corpo;
      assert.ok(!cats.some((c) => c.id === a.categoria.id));
      const fontes = (await chamar('GET', '/api/fontes-destinos', { token: b.token })).corpo;
      assert.ok(!fontes.some((f) => f.id === a.fonte.id));
      const rel = await chamar('GET', '/api/relatorios/categorias?inicio=2026-11-01&fim=2026-11-30', { token: b.token });
      assert.equal(JSON.stringify(rel.corpo).includes('Compra de Ana'), false);
      // filtro por id de categoria de outro usuário: lista vazia, nunca os dados dele
      const filtrado = await chamar('GET', `/api/lancamentos?categoriaId=${a.categoria.id}&inicio=2026-01-01&fim=2026-12-31`, { token: b.token });
      assert.equal(filtrado.corpo.total, 0);
    });

    test('criar lançamento apontando para categoria ou fonte de outro usuário: 400 por campo e nada é gravado', async () => {
      const r = await chamar('POST', '/api/lancamentos', {
        token: b.token,
        corpo: { tipo: 'saida', valor: 9, descricao: 'Cruzado', data: '2026-11-12', categoriaId: a.categoria.id, fonteDestinoId: a.fonte.id },
      });
      assert.equal(r.status, 400);
      assert.ok(r.corpo.campos.categoriaId);
      assert.ok(r.corpo.campos.fonteDestinoId);
      const { rows } = await pool.query("SELECT COUNT(*)::int AS n FROM lancamentos WHERE descricao = 'Cruzado'");
      assert.equal(rows[0].n, 0);
    });
  });

  describe('nenhuma resposta expõe senha_hash (nem a senha, nem o CPF)', () => {
    test('cadastro, login e /me devolvem só id, nome e e-mail', async () => {
      const cadastro = await chamar('POST', '/api/auth/cadastro', {
        corpo: { nome: 'Carla', email: 'carla@teste.com', cpf: '39053344705', senha: 'senha1234' },
      });
      assert.deepEqual(Object.keys(cadastro.corpo).sort(), ['email', 'id', 'nome']);
      const login = await chamar('POST', '/api/auth/login', { corpo: { email: 'carla@teste.com', senha: 'senha1234' } });
      assert.deepEqual(Object.keys(login.corpo).sort(), ['token', 'usuario']);
      assert.deepEqual(Object.keys(login.corpo.usuario).sort(), ['email', 'id', 'nome']);
      const eu = await chamar('GET', '/api/auth/me', { token: login.corpo.token });
      assert.deepEqual(Object.keys(eu.corpo).sort(), ['email', 'id', 'nome']);
    });

    test('em nenhuma resposta do teste aparece senha_hash, o hash bcrypt, a senha ou um CPF', async () => {
      await chamar('POST', '/api/auth/cadastro', { corpo: { nome: 'Dani', email: 'dani@teste.com', cpf: '39053344705', senha: 'senha1234' } });
      await chamar('POST', '/api/auth/cadastro', { corpo: { nome: 'Dani', email: 'dani@teste.com', cpf: '39053344705', senha: 'senha1234' } }); // 409
      await chamar('POST', '/api/auth/login', { corpo: { email: 'dani@teste.com', senha: 'errada123' } });
      await chamar('GET', '/api/auth/me', { token: a.token });
      for (const caminho of ['/api/categorias', '/api/fontes-destinos', '/api/lancamentos', '/api/relatorios/faturas', '/api/saude-financeira']) {
        await chamar('GET', caminho, { token: a.token });
      }
      assert.ok(todasAsRespostas.length > 10);
      for (const { metodo, caminho, texto } of todasAsRespostas) {
        assert.doesNotMatch(texto, /senha_hash|\$2[aby]\$|senha1234|52998224725|11144477735|39053344705/, `${metodo} ${caminho}`);
      }
    });
  });

  describe('entradas maliciosas', () => {
    const contar = async (tabela) => (await pool.query(`SELECT COUNT(*)::int AS n FROM ${tabela}`)).rows[0].n;

    test('injeção de SQL em login, cadastro, nomes e filtros não funciona e nunca dá 500', async () => {
      const antes = { usuarios: await contar('usuarios'), categorias: await contar('categorias'), lancamentos: await contar('lancamentos') };
      const payloads = ["' OR '1'='1' --", "'; DROP TABLE usuarios; --", "1; DELETE FROM lancamentos; --", "\\'; SELECT pg_sleep(5); --"];

      for (const p of payloads) {
        const login = await chamar('POST', '/api/auth/login', { corpo: { email: `${p}@x.com`, senha: p } });
        assert.ok([400, 401].includes(login.status), `login ${p}: ${login.status}`);
        const cat = await chamar('POST', '/api/categorias', { token: a.token, corpo: { nome: `Cat ${p}`.slice(0, 60), tipo: 'saida' } });
        assert.ok([201, 409].includes(cat.status), `categoria ${p}: ${cat.status}`);
        const filtros = await Promise.all([
          chamar('GET', `/api/lancamentos?categoriaId=${encodeURIComponent(p)}`, { token: a.token }),
          chamar('GET', `/api/lancamentos?tipo=${encodeURIComponent(p)}`, { token: a.token }),
          chamar('GET', `/api/lancamentos?pagina=${encodeURIComponent(p)}`, { token: a.token }),
          chamar('GET', `/api/lancamentos?inicio=${encodeURIComponent(p)}`, { token: a.token }),
          chamar('GET', `/api/categorias?tipo=${encodeURIComponent(p)}`, { token: a.token }),
          chamar('GET', `/api/fontes-destinos?tipo=${encodeURIComponent(p)}`, { token: a.token }),
          chamar('GET', `/api/relatorios/faturas?meses=${encodeURIComponent(p)}`, { token: a.token }),
          chamar('GET', `/api/relatorios/categorias?inicio=${encodeURIComponent(p)}`, { token: a.token }),
          chamar('DELETE', `/api/lancamentos/${a.lancamento.id}?todasParcelas=${encodeURIComponent(p)}`, { token: a.token }),
        ]);
        for (const f of filtros) assert.equal(f.status, 400, p);
      }
      assert.equal(await contar('usuarios'), antes.usuarios, 'nenhum usuário some');
      assert.ok((await contar('categorias')) >= antes.categorias);
      assert.equal(await contar('lancamentos'), antes.lancamentos, 'nenhum lançamento some');
    });

    test('um valor com aspas e SQL é gravado literalmente, como texto', async () => {
      const nome = "Robert'); DROP TABLE usuarios;--";
      const r = await chamar('POST', '/api/categorias', { token: a.token, corpo: { nome, tipo: 'entrada' } });
      assert.equal(r.status, 201);
      assert.equal(r.corpo.nome, nome);
      const { rows } = await pool.query('SELECT nome FROM categorias WHERE id = $1', [r.corpo.id]);
      assert.equal(rows[0].nome, nome);
    });

    test('caracteres de controle (NUL) são removidos de nomes e descrições, em vez de causar erro 500', async () => {
      const cat = await chamar('POST', '/api/categorias', { token: a.token, corpo: { nome: 'Pet\u0000shop', tipo: 'saida' } });
      assert.equal(cat.status, 201);
      assert.equal(cat.corpo.nome, 'Petshop');
      const fonte = await chamar('POST', '/api/fontes-destinos', { token: a.token, corpo: { nome: 'Car\u0000teira', tipo: 'conta' } });
      assert.equal(fonte.status, 201);
      assert.equal(fonte.corpo.nome, 'Carteira');
      const lanc = await chamar('POST', '/api/lancamentos', {
        token: a.token,
        corpo: { tipo: 'saida', valor: 5, descricao: 'Pa\u0000dari\u0007a', data: '2026-11-13', categoriaId: a.categoria.id, fonteDestinoId: a.fonte.id },
      });
      assert.equal(lanc.status, 201);
      assert.equal(lanc.corpo[0].descricao, 'Padaria');
      const cadastro = await chamar('POST', '/api/auth/cadastro', {
        corpo: { nome: 'Eva\u0000', email: 'eva@teste.com', cpf: '39053344705', senha: 'senha1234' },
      });
      assert.equal(cadastro.status, 201);
      assert.equal(cadastro.corpo.nome, 'Eva');
      const email = await chamar('POST', '/api/auth/cadastro', {
        corpo: { nome: 'Eva', email: 'eva\u0000@teste.com', cpf: '39053344705', senha: 'senha1234' },
      });
      assert.equal(email.status, 400);
    });

    test('tipos errados no corpo (número, objeto, lista) viram 400, não 500', async () => {
      for (const corpo of [{ nome: 123, tipo: 'saida' }, { nome: { $ne: '' }, tipo: 'saida' }, { nome: ['x'], tipo: ['saida'] }]) {
        assert.equal((await chamar('POST', '/api/categorias', { token: a.token, corpo })).status, 400);
      }
      for (const corpo of [{ email: { $ne: null }, senha: { $ne: null } }, { email: ['a@b.com'], senha: ['x'] }]) {
        assert.equal((await chamar('POST', '/api/auth/login', { corpo })).status, 400);
      }
      const lanc = await chamar('POST', '/api/lancamentos', {
        token: a.token,
        corpo: { tipo: 'saida', valor: '10; DROP TABLE lancamentos', descricao: ['x'], data: { a: 1 }, categoriaId: { id: 1 }, fonteDestinoId: [1] },
      });
      assert.equal(lanc.status, 400);
      assert.ok(lanc.corpo.campos.valor && lanc.corpo.campos.descricao && lanc.corpo.campos.data);
    });
  });

  describe('padrão único de erro e códigos HTTP', () => {
    test('toda resposta de erro tem { erro: string } e, quando há campos, campos é { campo: string }', async () => {
      const pedidos = [
        ['POST', '/api/auth/cadastro', { corpo: {} }],
        ['POST', '/api/auth/cadastro', { corpo: { nome: 'Ana', email: 'ana@teste.com', cpf: '52998224725', senha: 'senha1234' } }],
        ['POST', '/api/auth/login', { corpo: { email: 'ana@teste.com', senha: 'errada123' } }],
        ['POST', '/api/categorias', { token: a.token, corpo: { nome: a.categoria.nome, tipo: 'saida' } }],
        ['PUT', `/api/categorias/${b.categoria.id}`, { token: a.token, corpo: { nome: 'x', tipo: 'saida' } }],
        ['GET', '/api/lancamentos?tipo=x', { token: a.token }],
        ['DELETE', `/api/fontes-destinos/${a.fonte.id}`, { token: a.token }],
        ['GET', '/api/categorias', {}],
        ['GET', '/api/rota-inexistente', {}],
      ];
      const status = [];
      for (const [metodo, caminho, opcoes] of pedidos) {
        const r = await chamar(metodo, caminho, opcoes);
        status.push(r.status);
        assert.ok(r.status >= 400, `${metodo} ${caminho}`);
        assert.equal(typeof r.corpo.erro, 'string', `${metodo} ${caminho}`);
        if (r.corpo.campos !== undefined) {
          for (const mensagem of Object.values(r.corpo.campos)) assert.equal(typeof mensagem, 'string');
        }
      }
      assert.deepEqual(status, [400, 409, 401, 409, 404, 400, 409, 401, 404]);
    });
  });
});

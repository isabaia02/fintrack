import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { lerOrigens, lerTrustProxy, validarAmbiente } from '../src/config/ambiente.js';
import { criarApp } from '../src/app.js';
import { limparTexto, temControle } from '../src/utils/texto.js';

// Checklist de segurança (BE-10) que não precisa de banco. O que depende do Postgres está em
// segurancaIntegracao.test.js.

const RAIZ = fileURLToPath(new URL('../src', import.meta.url));

async function arquivosJs(pasta) {
  const itens = await readdir(pasta, { withFileTypes: true });
  const lista = await Promise.all(itens.map((i) => (i.isDirectory()
    ? arquivosJs(join(pasta, i.name))
    : [join(pasta, i.name)])));
  return lista.flat().filter((f) => f.endsWith('.js'));
}

// Extrai os template literals de um código-fonte JS, ignorando comentários e strings comuns
// (um `...` solto num comentário não pode desalinhar a leitura).
function extrairTemplates(fonte) {
  const achados = [];

  function lerTemplate(i) {
    let texto = '';
    const expressoes = [];
    i += 1;
    while (i < fonte.length && fonte[i] !== '`') {
      if (fonte[i] === '\\') { texto += fonte.slice(i, i + 2); i += 2; continue; }
      if (fonte[i] === '$' && fonte[i + 1] === '{') {
        let nivel = 1;
        let j = i + 2;
        while (j < fonte.length && nivel > 0) {
          if (fonte[j] === '`') { j = lerTemplate(j); continue; }
          if (fonte[j] === "'" || fonte[j] === '"') j = pularString(j);
          else {
            if (fonte[j] === '{') nivel += 1;
            if (fonte[j] === '}') nivel -= 1;
            j += 1;
          }
        }
        expressoes.push(fonte.slice(i + 2, j - 1));
        texto += '${}';
        i = j;
        continue;
      }
      texto += fonte[i];
      i += 1;
    }
    achados.push({ texto, expressoes });
    return i + 1;
  }

  function pularString(i) {
    const aspa = fonte[i];
    let j = i + 1;
    while (j < fonte.length && fonte[j] !== aspa) j += fonte[j] === '\\' ? 2 : 1;
    return j + 1;
  }

  let i = 0;
  while (i < fonte.length) {
    const c = fonte[i];
    if (c === '/' && fonte[i + 1] === '/') i = fonte.indexOf('\n', i) === -1 ? fonte.length : fonte.indexOf('\n', i);
    else if (c === '/' && fonte[i + 1] === '*') i = fonte.indexOf('*/', i) + 2;
    else if (c === "'" || c === '"') i = pularString(i);
    else if (c === '`') i = lerTemplate(i);
    else i += 1;
  }
  return achados;
}

describe('consultas parametrizadas', () => {
  // Interpolações permitidas dentro de SQL: trechos fixos do código ou índices de parâmetro ($n).
  // Nenhuma delas recebe entrada do usuário (valores sempre vão em params).
  const PERMITIDAS = new Set([
    'SELECT_COM_TOTAL', 'SELECT_LANCAMENTO', 'CAMPOS_PUBLICOS', 'filtro', 'where', 'ORDEM',
    'params.length + 1', 'params.length + 2', 'params.length',
  ]);
  const SQL = /\b(SELECT|INSERT INTO|UPDATE|DELETE FROM|WHERE|FROM|GROUP BY|ORDER BY|LIMIT|OFFSET)\b/;
  // Um template que só junta pedaços de SQL (`${SELECT_COM_TOTAL}${filtro}...`) não tem palavra-chave no próprio texto.
  const ehSql = ({ texto, expressoes }) => SQL.test(texto) || expressoes.some((e) => /^(SELECT_|filtro|where|ORDEM|CAMPOS_PUBLICOS)/.test(e.trim()));

  test('o extrator enxerga templates com comentários e strings no caminho', () => {
    const achados = extrairTemplates("// `solto\nconst a = 'x`y'; const q = `SELECT ${b} ${`n${c}`}`;");
    assert.equal(achados.length, 2); // o template de fora e o de dentro; o comentário e a string não contam
    assert.ok(achados.some((t) => t.texto.startsWith('SELECT') && t.expressoes.includes('b')));
  });

  test('nenhum SQL interpola entrada do usuário (só constantes do código e índices de $n)', async () => {
    const suspeitos = [];
    let consultasLidas = 0;
    for (const arquivo of await arquivosJs(RAIZ)) {
      for (const template of extrairTemplates(await readFile(arquivo, 'utf8'))) {
        if (!ehSql(template)) continue;
        const { expressoes } = template;
        consultasLidas += 1;
        for (const expressao of expressoes) {
          if (!PERMITIDAS.has(expressao.trim())) suspeitos.push(`${arquivo.replace(RAIZ, 'src')}: \${${expressao}}`);
        }
      }
    }
    assert.ok(consultasLidas >= 10, 'o teste precisa estar enxergando as consultas do projeto');
    assert.deepEqual(suspeitos, [], 'interpolação inesperada em SQL: use parâmetros ($1, $2...)');
  });
});

describe('sanitização de texto', () => {
  test('remove caracteres de controle (incl. NUL) e espaços nas pontas', () => {
    assert.equal(limparTexto('  Mercado\u0000\u0007 do Zé \n'), 'Mercado do Zé');
    assert.equal(limparTexto(undefined), '');
    assert.equal(limparTexto({ nome: 'x' }), '');
  });

  test('tab e quebras de linha viram espaço, sem grudar as palavras', () => {
    assert.equal(limparTexto('Mercado\tCentral'), 'Mercado Central');
    assert.equal(limparTexto('Linha 1\r\nLinha 2'), 'Linha 1 Linha 2');
    assert.equal(limparTexto('a \t  b'), 'a b');
  });

  test('remove controles de direção do Unicode e controles C1 (spoofing de exibição)', () => {
    assert.equal(limparTexto('Conta\u202Etxt.exe'), 'Contatxt.exe');
    assert.equal(limparTexto('a\u2066b\u2069c'), 'abc');
    assert.equal(limparTexto('a\u0085b\u009fc'), 'abc');
  });

  test('não altera HTML/aspas (a API só devolve JSON; quem exibe escapa)', () => {
    assert.equal(limparTexto(`<b>"x"</b> & 'y'`), `<b>"x"</b> & 'y'`);
  });

  test('temControle detecta NUL e DEL', () => {
    assert.equal(temControle('a\u0000b'), true);
    assert.equal(temControle('a\u007fb'), true);
    assert.equal(temControle('a\u202Eb'), true);
    assert.equal(temControle('a\u0085b'), true);
    assert.equal(temControle('ação'), false);
  });
});

describe('configuração do ambiente (.env)', () => {
  const base = { DATABASE_URL: 'postgresql://x/y', JWT_SECRET: 'a'.repeat(40), CORS_ORIGIN: 'http://localhost:5173' };

  test('exige DATABASE_URL e JWT_SECRET na subida', () => {
    assert.throws(() => validarAmbiente({ ...base, DATABASE_URL: '' }), /DATABASE_URL/);
    assert.throws(() => validarAmbiente({ ...base, JWT_SECRET: '' }), /JWT_SECRET/);
  });

  test('segredo curto ou o do .env.example: aviso em desenvolvimento, erro em produção', () => {
    for (const JWT_SECRET of ['curto', 'troque-por-um-segredo-longo-e-aleatorio']) {
      assert.equal(validarAmbiente({ ...base, JWT_SECRET }).avisos.length, 1);
      assert.throws(() => validarAmbiente({ ...base, JWT_SECRET, NODE_ENV: 'production' }), /JWT_SECRET fraco/);
    }
    assert.deepEqual(validarAmbiente(base).avisos, []);
  });

  test('CORS_ORIGIN: lista separada por vírgula, sem "*", obrigatório em produção', () => {
    assert.deepEqual(lerOrigens('http://a.com, https://b.com/'), ['http://a.com', 'https://b.com']);
    assert.deepEqual(lerOrigens(undefined), ['http://localhost:5173']);
    assert.throws(() => lerOrigens('*'), /não pode ser "\*"/);
    assert.throws(() => lerOrigens('http://a.com,*'), /não pode ser "\*"/);
  });

  test('TRUST_PROXY: true/false, número de proxies ou lista; vazio não liga nada', () => {
    assert.equal(lerTrustProxy(undefined), undefined);
    assert.equal(lerTrustProxy('  '), undefined);
    assert.equal(lerTrustProxy('true'), true);
    assert.equal(lerTrustProxy('TRUE'), true);
    assert.equal(lerTrustProxy('false'), false);
    assert.equal(lerTrustProxy('1'), 1);
    assert.equal(lerTrustProxy('0'), 0);
    assert.equal(lerTrustProxy('loopback'), 'loopback');
    assert.equal(lerTrustProxy('10.0.0.0/8, 127.0.0.1'), '10.0.0.0/8, 127.0.0.1');
  });

  test('TRUST_PROXY=true não derruba a subida e gera aviso; o app aceita cada forma', () => {
    const base = { DATABASE_URL: 'postgres://x', JWT_SECRET: 'a'.repeat(40) };
    const { trustProxy, avisos } = validarAmbiente({ ...base, TRUST_PROXY: 'true' });
    assert.equal(trustProxy, true);
    assert.equal(avisos.length, 1);
    assert.match(avisos[0], /número de proxies/);
    assert.deepEqual(validarAmbiente({ ...base, TRUST_PROXY: '1' }).avisos, []);

    const origens = ['http://localhost:5173'];
    for (const valor of [true, false, 0, 1, 'loopback', undefined]) {
      const app = criarApp({ origens, trustProxy: valor });
      if (valor !== undefined) assert.equal(app.get('trust proxy'), valor);
    }
    assert.throws(() => lerOrigens('', true), /obrigatório em produção/);
  });
});

describe('app HTTP (sem banco)', () => {
  let app;
  const OUTRA_ORIGEM = 'http://site-malicioso.example';
  const ORIGEM = 'http://localhost:5173';

  before(async () => {
    process.env.JWT_SECRET = 'segredo-de-teste-com-mais-de-trinta-caracteres';
    process.env.DATABASE_URL = 'postgresql://localhost:5432/nao_usado';
    const { criarApp } = await import('../src/app.js');
    const servidor = await new Promise((resolver) => {
      const s = criarApp({ origens: [ORIGEM] }).listen(0, () => resolver(s));
    });
    app = {
      url: `http://127.0.0.1:${servidor.address().port}`,
      fechar: () => new Promise((resolver) => servidor.close(resolver)),
    };
  });

  after(async () => {
    await app?.fechar();
    const { pool } = await import('../src/config/db.js');
    await pool.end();
  });

  test('CORS: a origem do front recebe os cabeçalhos; outra origem não recebe', async () => {
    const permitida = await fetch(`${app.url}/api/auth/me`, { headers: { origin: ORIGEM } });
    assert.equal(permitida.headers.get('access-control-allow-origin'), ORIGEM);

    const negada = await fetch(`${app.url}/api/auth/me`, { headers: { origin: OUTRA_ORIGEM } });
    assert.equal(negada.headers.get('access-control-allow-origin'), null);
  });

  test('CORS: preflight só libera os métodos e cabeçalhos usados pelo front', async () => {
    const resposta = await fetch(`${app.url}/api/lancamentos`, {
      method: 'OPTIONS',
      headers: { origin: ORIGEM, 'access-control-request-method': 'DELETE' },
    });
    assert.equal(resposta.status, 204);
    assert.equal(resposta.headers.get('access-control-allow-methods'), 'GET,POST,PUT,PATCH,DELETE');
    assert.equal(resposta.headers.get('access-control-allow-headers'), 'Authorization,Content-Type');

    const negada = await fetch(`${app.url}/api/lancamentos`, {
      method: 'OPTIONS',
      headers: { origin: OUTRA_ORIGEM, 'access-control-request-method': 'DELETE' },
    });
    assert.equal(negada.headers.get('access-control-allow-origin'), null);
  });

  test('cabeçalhos de segurança, sem X-Powered-By e sem cache', async () => {
    const resposta = await fetch(`${app.url}/api/auth/me`);
    assert.equal(resposta.headers.get('x-powered-by'), null);
    assert.equal(resposta.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(resposta.headers.get('cache-control'), 'no-store');
    assert.equal(resposta.headers.get('x-frame-options'), 'DENY');
  });

  test('rota inexistente: 404 no padrão { erro }', async () => {
    const resposta = await fetch(`${app.url}/api/nao-existe`);
    assert.equal(resposta.status, 404);
    assert.deepEqual(await resposta.json(), { erro: 'Rota não encontrada.' });
  });

  test('toda rota protegida sem token devolve 401 { erro }', async () => {
    const rotas = [
      ['GET', '/api/auth/me'],
      ['GET', '/api/categorias'], ['POST', '/api/categorias'], ['PUT', '/api/categorias/1'], ['DELETE', '/api/categorias/1'],
      ['GET', '/api/fontes-destinos'], ['POST', '/api/fontes-destinos'], ['PUT', '/api/fontes-destinos/1'], ['DELETE', '/api/fontes-destinos/1'],
      ['GET', '/api/lancamentos'], ['POST', '/api/lancamentos'], ['GET', '/api/lancamentos/1'],
      ['PUT', '/api/lancamentos/1'], ['PATCH', '/api/lancamentos/1'], ['DELETE', '/api/lancamentos/1'],
      ['GET', '/api/relatorios/faturas'], ['GET', '/api/relatorios/categorias'], ['GET', '/api/relatorios/fontes-destinos'],
      ['GET', '/api/saude-financeira'],
    ];
    for (const [metodo, caminho] of rotas) {
      const resposta = await fetch(`${app.url}${caminho}`, { method: metodo });
      assert.equal(resposta.status, 401, `${metodo} ${caminho}`);
      const corpo = await resposta.json();
      assert.equal(typeof corpo.erro, 'string', `${metodo} ${caminho}`);
    }
  });

  test('token com assinatura errada, algoritmo "none" ou lixo: 401', async () => {
    const semAssinatura = `${Buffer.from('{"alg":"none","typ":"JWT"}').toString('base64url')}.${Buffer.from('{"sub":"1"}').toString('base64url')}.`;
    for (const token of ['lixo', semAssinatura, 'a.b.c']) {
      const resposta = await fetch(`${app.url}/api/categorias`, { headers: { authorization: `Bearer ${token}` } });
      assert.equal(resposta.status, 401, token);
    }
  });

  test('JSON malformado: 400; corpo grande demais: 413; nunca 500', async () => {
    const malformado = await fetch(`${app.url}/api/auth/login`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"email":',
    });
    assert.equal(malformado.status, 400);
    assert.deepEqual(await malformado.json(), { erro: 'JSON inválido.' });

    const grande = await fetch(`${app.url}/api/auth/login`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'a@b.com', senha: 'x'.repeat(200_000) }),
    });
    assert.equal(grande.status, 413);
    assert.equal(typeof (await grande.json()).erro, 'string');
  });

  test('validação de entrada: 400 no padrão { erro, campos } (sem tocar no banco)', async () => {
    const pedidos = [
      ['/api/auth/cadastro', { nome: '', email: 'x', cpf: '1', senha: '1' }, ['nome', 'email', 'cpf', 'senha']],
      ['/api/auth/login', { email: 'a\u0000@b.com', senha: 'x' }, ['email']],
    ];
    for (const [caminho, corpo, esperados] of pedidos) {
      const resposta = await fetch(`${app.url}${caminho}`, {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(corpo),
      });
      assert.equal(resposta.status, 400, caminho);
      const json = await resposta.json();
      assert.equal(json.erro, 'Dados inválidos.');
      assert.deepEqual(Object.keys(json.campos).sort(), esperados.sort());
    }
  });

  test('senha com NUL é recusada (o bcrypt cortaria a senha no NUL)', async () => {
    const resposta = await fetch(`${app.url}/api/auth/cadastro`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ nome: 'Ana', email: 'ana@teste.com', cpf: '52998224725', senha: 'abc12345\u0000resto' }),
    });
    assert.equal(resposta.status, 400);
    assert.ok((await resposta.json()).campos.senha);
  });
});

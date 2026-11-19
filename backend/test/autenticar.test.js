import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { subirApp } from './helpers.js';

process.env.JWT_SECRET = 'segredo-de-teste';

const { autenticar } = await import('../src/middlewares/autenticar.js');

let app;

before(async () => {
  app = await subirApp((servidor) => {
    servidor.get('/protegida', autenticar, (req, res) => res.json({ usuarioId: req.usuarioId }));
    servidor.use((erro, req, res, next) => res.status(500).json({ erro: erro.message }));
  });
});

after(() => app.fechar());

const chamar = (token) =>
  fetch(`${app.url}/protegida`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });

test('sem token retorna 401', async () => {
  const res = await chamar();
  assert.equal(res.status, 401);
  assert.equal((await res.json()).erro, 'Token não informado.');
});

test('token válido libera e expõe o id do usuário', async () => {
  const token = jwt.sign({}, process.env.JWT_SECRET, { subject: '7', algorithm: 'HS256' });
  const res = await chamar(token);
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { usuarioId: 7 });
});

test('token expirado retorna SESSAO_EXPIRADA', async () => {
  const token = jwt.sign({}, process.env.JWT_SECRET, { subject: '7', expiresIn: -10 });
  const res = await chamar(token);
  assert.equal(res.status, 401);
  assert.equal((await res.json()).codigo, 'SESSAO_EXPIRADA');
});

test('token com sub não numérico retorna 401', async () => {
  const token = jwt.sign({}, process.env.JWT_SECRET, { subject: 'abc' });
  const res = await chamar(token);
  assert.equal(res.status, 401);
  assert.equal((await res.json()).erro, 'Token inválido.');
});

test('token assinado com outro algoritmo é recusado', async () => {
  const token = jwt.sign({}, process.env.JWT_SECRET, { subject: '7', algorithm: 'HS512' });
  const res = await chamar(token);
  assert.equal(res.status, 401);
});

test('token adulterado retorna 401 sem codigo', async () => {
  const token = jwt.sign({}, 'outro-segredo', { subject: '7' });
  const res = await chamar(token);
  assert.equal(res.status, 401);
  assert.equal((await res.json()).codigo, undefined);
});

test('JWT_SECRET ausente vira 500 e não 401', async () => {
  const segredo = process.env.JWT_SECRET;
  const token = jwt.sign({}, segredo, { subject: '7' });
  delete process.env.JWT_SECRET;
  try {
    const res = await chamar(token);
    assert.equal(res.status, 500);
  } finally {
    process.env.JWT_SECRET = segredo;
  }
});

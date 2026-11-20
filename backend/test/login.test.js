import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { subirApp } from './helpers.js';

process.env.LOGIN_RATE_LIMIT_MAX = '3';

const { validarLogin } = await import('../src/middlewares/validarLogin.js');
const { limitarLogin, lerLimite } = await import('../src/middlewares/limitarLogin.js');

let app;

before(async () => {
  app = await subirApp((servidor) => {
    servidor.post('/login', validarLogin, limitarLogin, (req, res) => {
      if (req.dadosLogin.senha === 'correta1') return res.json({ email: req.dadosLogin.email });
      return res.status(401).json({ erro: 'E-mail ou senha inválidos.' });
    });
  });
});

after(() => app.fechar());

const entrar = (corpo) =>
  fetch(`${app.url}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(corpo),
  });

test('campos vazios retornam 400 com mensagem por campo', async () => {
  const res = await entrar({ email: '  ', senha: '' });
  assert.equal(res.status, 400);
  assert.deepEqual((await res.json()).campos, { email: 'Informe o e-mail.', senha: 'Informe a senha.' });
});

test('e-mail é normalizado antes de seguir', async () => {
  const res = await entrar({ email: '  ANA@Email.com ', senha: 'correta1' });
  assert.equal(res.status, 200);
  assert.equal((await res.json()).email, 'ana@email.com');
});

test('respostas 400 e logins válidos não consomem o limite; 429 após as falhas', async () => {
  for (let i = 0; i < 5; i++) await entrar({ email: '', senha: '' });
  for (let i = 0; i < 5; i++) assert.equal((await entrar({ email: 'a@a.com', senha: 'correta1' })).status, 200);

  for (let i = 0; i < 3; i++) assert.equal((await entrar({ email: 'a@a.com', senha: 'errada12' })).status, 401);

  const bloqueada = await entrar({ email: 'a@a.com', senha: 'errada12' });
  assert.equal(bloqueada.status, 429);
  assert.equal((await bloqueada.json()).erro, 'Muitas tentativas. Tente novamente em alguns minutos.');
});

test('lerLimite usa 10 quando o valor é vazio ou inválido', () => {
  assert.equal(lerLimite(undefined), 10);
  assert.equal(lerLimite(''), 10);
  assert.equal(lerLimite('abc'), 10);
  assert.equal(lerLimite('0'), 10);
  assert.equal(lerLimite('-5'), 10);
  assert.equal(lerLimite('25'), 25);
});

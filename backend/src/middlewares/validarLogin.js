import { normalizarEmail, texto } from '../utils/texto.js';

export function validarLogin(req, res, next) {
  const corpo = req.body ?? {};
  const email = normalizarEmail(corpo.email);
  const senha = texto(corpo.senha);
  const campos = {};

  if (!email) campos.email = 'Informe o e-mail.';
  if (!senha) campos.senha = 'Informe a senha.';

  if (Object.keys(campos).length) {
    return res.status(400).json({ erro: 'Dados inválidos.', campos });
  }
  req.dadosLogin = { email, senha };
  return next();
}

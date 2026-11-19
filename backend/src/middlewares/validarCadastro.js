import { cpfValido } from '../models/cpf.js';

const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validarCadastro(req, res, next) {
  const corpo = req.body ?? {};
  const texto = (v) => (typeof v === 'string' ? v : '');
  const nome = texto(corpo.nome).trim();
  const email = texto(corpo.email).trim().toLowerCase();
  const cpf = texto(corpo.cpf).replace(/\D/g, '');
  const senha = texto(corpo.senha);
  const campos = {};

  if (!nome) campos.nome = 'Informe o nome.';
  else if (nome.length > 120) campos.nome = 'O nome deve ter no máximo 120 caracteres.';

  if (!email) campos.email = 'Informe o e-mail.';
  else if (!REGEX_EMAIL.test(email) || email.length > 160) campos.email = 'Informe um e-mail válido.';

  if (!cpf) campos.cpf = 'Informe o CPF.';
  else if (!cpfValido(cpf)) campos.cpf = 'Informe um CPF válido.';

  if (!senha) campos.senha = 'Informe a senha.';
  else if (senha.length < 8 || !/[A-Za-z]/.test(senha) || !/\d/.test(senha)) {
    campos.senha = 'A senha deve ter no mínimo 8 caracteres, com letras e números.';
  } else if (Buffer.byteLength(senha) > 72) {
    campos.senha = 'A senha deve ter no máximo 72 caracteres.';
  }

  if (corpo.confirmarSenha !== undefined && corpo.confirmarSenha !== senha) {
    campos.confirmarSenha = 'As senhas não conferem.';
  }

  if (Object.keys(campos).length) {
    return res.status(400).json({ erro: 'Dados inválidos.', campos });
  }
  req.dadosCadastro = { nome, email, cpf, senha };
  return next();
}

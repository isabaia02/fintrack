import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { jwtConfig } from '../config/jwt.js';
import { autenticar } from '../middlewares/autenticar.js';
import { limitarLogin } from '../middlewares/limitarLogin.js';
import { validarCadastro } from '../middlewares/validarCadastro.js';
import { criarComPadroes, campoDuplicado, buscarPorEmail, buscarPorId } from '../models/usuario.js';

const router = Router();

// Hash descartável: a senha é comparada mesmo quando o e-mail não existe,
// para o tempo de resposta não revelar se o e-mail está cadastrado.
const HASH_FALSO = bcrypt.hashSync('senha-inexistente', 10);

const MENSAGENS_DUPLICADO = {
  email: 'Já existe um usuário com este e-mail.',
  cpf: 'Já existe um usuário com este CPF.',
};

router.post('/cadastro', validarCadastro, async (req, res, next) => {
  const { nome, email, cpf, senha } = req.dadosCadastro;
  try {
    const senhaHash = await bcrypt.hash(senha, 10);
    const usuario = await criarComPadroes({ nome, email, cpf, senhaHash });
    return res.status(201).json(usuario);
  } catch (erro) {
    const campo = campoDuplicado(erro);
    if (campo) {
      return res.status(409).json({
        erro: 'Usuário já cadastrado.',
        campos: { [campo]: MENSAGENS_DUPLICADO[campo] },
      });
    }
    return next(erro);
  }
});

router.post('/login', limitarLogin, async (req, res, next) => {
  const corpo = req.body ?? {};
  const email = typeof corpo.email === 'string' ? corpo.email.trim().toLowerCase() : '';
  const senha = typeof corpo.senha === 'string' ? corpo.senha : '';

  const campos = {};
  if (!email) campos.email = 'Informe o e-mail.';
  if (!senha) campos.senha = 'Informe a senha.';
  if (Object.keys(campos).length) {
    return res.status(400).json({ erro: 'Dados inválidos.', campos });
  }

  try {
    const registro = await buscarPorEmail(email);
    const senhaConfere = await bcrypt.compare(senha, registro?.senha_hash ?? HASH_FALSO);
    if (!registro || !senhaConfere) {
      return res.status(401).json({ erro: 'E-mail ou senha inválidos.' });
    }

    const { senha_hash: _senhaHash, ...usuario } = registro;
    const token = jwt.sign({}, jwtConfig.secret, {
      subject: String(usuario.id),
      expiresIn: jwtConfig.expiresIn,
    });
    return res.json({ token, usuario });
  } catch (erro) {
    return next(erro);
  }
});

router.get('/me', autenticar, async (req, res, next) => {
  try {
    const usuario = await buscarPorId(req.usuarioId);
    if (!usuario) return res.status(401).json({ erro: 'Token inválido.' });
    return res.json(usuario);
  } catch (erro) {
    return next(erro);
  }
});

export default router;

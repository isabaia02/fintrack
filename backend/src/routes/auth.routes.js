import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { ALGORITMO_JWT, jwtConfig } from '../config/jwt.js';
import { CUSTO_BCRYPT } from '../config/senha.js';
import { autenticar } from '../middlewares/autenticar.js';
import { limitarCadastro, limitarLogin } from '../middlewares/limitarLogin.js';
import { validarCadastro } from '../middlewares/validarCadastro.js';
import { validarLogin } from '../middlewares/validarLogin.js';
import { criarComPadroes, campoDuplicado, buscarPorEmail, buscarPorId } from '../models/usuario.js';

const router = Router();

const HASH_FALSO = await bcrypt.hash('senha-inexistente', CUSTO_BCRYPT);

const MENSAGENS_DUPLICADO = {
  email: 'Já existe um usuário com este e-mail.',
  cpf: 'Já existe um usuário com este CPF.',
};

router.post('/cadastro', limitarCadastro, validarCadastro, async (req, res, next) => {
  const { nome, email, cpf, senha } = req.dadosCadastro;
  try {
    const senhaHash = await bcrypt.hash(senha, CUSTO_BCRYPT);
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

router.post('/login', validarLogin, limitarLogin, async (req, res, next) => {
  const { email, senha } = req.dadosLogin;

  try {
    const registro = await buscarPorEmail(email);
    const senhaConfere = await bcrypt.compare(senha, registro?.senha_hash ?? HASH_FALSO);
    if (!registro || !senhaConfere) {
      return res.status(401).json({ erro: 'E-mail ou senha inválidos.' });
    }

    const { senha_hash: _senhaHash, ...usuario } = registro;
    const token = jwt.sign({}, jwtConfig.secret, {
      algorithm: ALGORITMO_JWT,
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
    if (!usuario) {
      return res.status(401).json({ erro: 'Usuário não encontrado.', codigo: 'USUARIO_INEXISTENTE' });
    }
    return res.json(usuario);
  } catch (erro) {
    return next(erro);
  }
});

export default router;

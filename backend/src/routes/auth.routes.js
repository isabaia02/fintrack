import { Router } from 'express';
import bcrypt from 'bcrypt';
import { validarCadastro } from '../middlewares/validarCadastro.js';
import { criarComPadroes, campoDuplicado } from '../models/usuario.js';

const router = Router();

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

export default router;

import { Router } from 'express';
import { autenticar } from '../middlewares/autenticar.js';
import {
  validarCriacaoCategoria,
  validarEdicaoCategoria,
  validarTipoFiltro,
} from '../middlewares/validarCategoria.js';
import * as Categoria from '../models/categoria.js';
import { exigirIdValido } from '../middlewares/validarId.js';

const router = Router();
router.use(autenticar);

const NAO_ENCONTRADA = { erro: 'Categoria não encontrada.' };

const erroNomeDuplicado = {
  erro: 'Categoria já cadastrada.',
  campos: { nome: 'Já existe uma categoria com este nome neste tipo.' },
};

const plural = (n) => `${n} ${n === 1 ? 'lançamento' : 'lançamentos'}`;

router.get('/', validarTipoFiltro, async (req, res, next) => {
  try {
    res.json(await Categoria.listar(req.usuarioId, req.query.tipo));
  } catch (erro) {
    next(erro);
  }
});

router.post('/', validarCriacaoCategoria, async (req, res, next) => {
  try {
    const categoria = await Categoria.criar(req.usuarioId, req.dadosCategoria);
    res.status(201).json(categoria);
  } catch (erro) {
    if (Categoria.nomeDuplicado(erro)) return res.status(409).json(erroNomeDuplicado);
    return next(erro);
  }
});

router.put('/:id', exigirIdValido(NAO_ENCONTRADA), validarEdicaoCategoria, async (req, res, next) => {
  try {
    const resultado = await Categoria.atualizar(req.usuarioId, req.idRecurso, req.dadosCategoria);
    if (resultado.naoEncontrada) return res.status(404).json(NAO_ENCONTRADA);
    if (resultado.tipoBloqueado) {
      return res.status(409).json({
        erro: `Esta categoria tem ${plural(resultado.tipoBloqueado)}. Não é possível mudar o tipo.`,
        campos: { tipo: 'Não é possível mudar o tipo de uma categoria com lançamentos.' },
      });
    }
    return res.json(resultado.categoria);
  } catch (erro) {
    if (Categoria.nomeDuplicado(erro)) return res.status(409).json(erroNomeDuplicado);
    return next(erro);
  }
});

router.delete('/:id', exigirIdValido(NAO_ENCONTRADA), async (req, res, next) => {
  try {
    const resultado = await Categoria.excluir(req.usuarioId, req.idRecurso);
    if (resultado.naoEncontrada) return res.status(404).json(NAO_ENCONTRADA);
    if (resultado.bloqueadaPor) {
      return res.status(409).json({
        erro: `Esta categoria tem ${plural(resultado.bloqueadaPor)}. Mova-${resultado.bloqueadaPor === 1 ? 'o' : 'os'} para outra categoria antes de excluir.`,
      });
    }
    return res.status(204).end();
  } catch (erro) {
    return next(erro);
  }
});

export default router;

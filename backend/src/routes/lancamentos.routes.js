import { Router } from 'express';
import { autenticar } from '../middlewares/autenticar.js';
import {
  responderInvalido,
  validarDadosLancamento,
  validarExclusao,
  validarFiltrosLancamento,
} from '../middlewares/validarLancamento.js';
import * as Lancamento from '../models/lancamento.js';

const router = Router();
router.use(autenticar);

const NAO_ENCONTRADO = { erro: 'Lançamento não encontrado.' };

function comoCorpo(lancamento) {
  return {
    tipo: lancamento.tipo,
    valor: lancamento.valor,
    descricao: lancamento.descricao,
    data: lancamento.data,
    categoriaId: lancamento.categoria.id,
    fonteDestinoId: lancamento.fonteDestino.id,
    parcelas: lancamento.total_parcelas,
  };
}

async function salvarEdicao(req, res, id, { dados, campos }) {
  const resultado = await Lancamento.atualizar(req.usuarioId, id, dados, campos);
  if (resultado.naoEncontrado) return res.status(404).json(NAO_ENCONTRADO);
  if (resultado.invalido) return responderInvalido(res, resultado.invalido);
  return res.json(resultado.lancamento);
}

router.get('/', validarFiltrosLancamento, async (req, res, next) => {
  try {
    res.json(await Lancamento.listar(req.usuarioId, req.filtros));
  } catch (erro) {
    next(erro);
  }
});

router.get('/:id', async (req, res, next) => {
  const id = Lancamento.idValido(req.params.id);
  if (!id) return res.status(404).json(NAO_ENCONTRADO);
  try {
    const lancamento = await Lancamento.buscar(req.usuarioId, id);
    if (!lancamento) return res.status(404).json(NAO_ENCONTRADO);
    return res.json(lancamento);
  } catch (erro) {
    return next(erro);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { dados, campos } = validarDadosLancamento(req.body ?? {});
    const resultado = await Lancamento.criar(req.usuarioId, dados, campos);
    if (resultado.invalido) return responderInvalido(res, resultado.invalido);
    return res.status(201).json(resultado.lancamentos);
  } catch (erro) {
    return next(erro);
  }
});

router.put('/:id', async (req, res, next) => {
  const id = Lancamento.idValido(req.params.id);
  if (!id) return res.status(404).json(NAO_ENCONTRADO);
  try {
    return await salvarEdicao(req, res, id, validarDadosLancamento(req.body ?? {}));
  } catch (erro) {
    return next(erro);
  }
});

router.patch('/:id', async (req, res, next) => {
  const id = Lancamento.idValido(req.params.id);
  if (!id) return res.status(404).json(NAO_ENCONTRADO);
  try {
    const atual = await Lancamento.buscar(req.usuarioId, id);
    if (!atual) return res.status(404).json(NAO_ENCONTRADO);

    const validacao = validarDadosLancamento({ ...comoCorpo(atual), ...(req.body ?? {}) });
    return await salvarEdicao(req, res, id, validacao);
  } catch (erro) {
    return next(erro);
  }
});

router.delete('/:id', validarExclusao, async (req, res, next) => {
  const id = Lancamento.idValido(req.params.id);
  if (!id) return res.status(404).json(NAO_ENCONTRADO);
  try {
    const resultado = await Lancamento.excluir(req.usuarioId, id, req.todasParcelas);
    if (resultado.naoEncontrado) return res.status(404).json(NAO_ENCONTRADO);
    return res.status(204).end();
  } catch (erro) {
    return next(erro);
  }
});

export default router;

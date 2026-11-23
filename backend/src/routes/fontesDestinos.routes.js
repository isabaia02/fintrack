import { Router } from 'express';
import { autenticar } from '../middlewares/autenticar.js';
import { validarFonteDestino, validarTipoFiltro } from '../middlewares/validarFonteDestino.js';
import * as FonteDestino from '../models/fonteDestino.js';
import { exigirIdValido } from '../middlewares/validarId.js';
import { idValido } from '../utils/id.js';

const router = Router();
router.use(autenticar);

const NAO_ENCONTRADO = { erro: 'Fonte ou destino não encontrado.' };

const erroNomeDuplicado = {
  erro: 'Fonte ou destino já cadastrado.',
  campos: { nome: 'Já existe uma fonte ou destino com este nome neste tipo.' },
};

const MENSAGENS_DIA_BLOQUEADO = {
  dia_fechamento: 'Não é possível mudar o dia de fechamento de um item com lançamentos.',
  dia_vencimento: 'Não é possível mudar o dia de vencimento de um item com lançamentos.',
};

const plural = (n) => `${n} ${n === 1 ? 'lançamento vinculado' : 'lançamentos vinculados'}`;

router.get('/', validarTipoFiltro, async (req, res, next) => {
  try {
    res.json(await FonteDestino.listar(req.usuarioId, req.query.tipo));
  } catch (erro) {
    next(erro);
  }
});

router.post('/', validarFonteDestino, async (req, res, next) => {
  try {
    res.status(201).json(await FonteDestino.criar(req.usuarioId, req.dadosFonteDestino));
  } catch (erro) {
    if (FonteDestino.nomeDuplicado(erro)) return res.status(409).json(erroNomeDuplicado);
    return next(erro);
  }
});

router.put('/:id', exigirIdValido(NAO_ENCONTRADO), validarFonteDestino, async (req, res, next) => {
  const id = idValido(req.params.id);
  if (!id) return res.status(404).json(NAO_ENCONTRADO);
  try {
    const resultado = await FonteDestino.atualizar(req.usuarioId, id, req.dadosFonteDestino);
    if (resultado.naoEncontrada) return res.status(404).json(NAO_ENCONTRADO);
    if (resultado.tipoBloqueado) {
      return res.status(409).json({
        erro: `Este item tem ${plural(resultado.tipoBloqueado)}. Não é possível mudar o tipo.`,
        campos: { tipo: 'Não é possível mudar o tipo de um item com lançamentos.' },
      });
    }
    if (resultado.diasBloqueados) {
      const { total, campos } = resultado.diasBloqueados;
      return res.status(409).json({
        erro: `Este item tem ${plural(total)}. Não é possível mudar o dia de fechamento ou de vencimento.`,
        campos: Object.fromEntries(campos.map((campo) => [campo, MENSAGENS_DIA_BLOQUEADO[campo]])),
      });
    }
    return res.json(resultado.fonteDestino);
  } catch (erro) {
    if (FonteDestino.nomeDuplicado(erro)) return res.status(409).json(erroNomeDuplicado);
    return next(erro);
  }
});

router.delete('/:id', async (req, res, next) => {
  const id = idValido(req.params.id);
  if (!id) return res.status(404).json(NAO_ENCONTRADO);
  try {
    const resultado = await FonteDestino.excluir(req.usuarioId, id);
    if (resultado.naoEncontrada) return res.status(404).json(NAO_ENCONTRADO);
    if (resultado.bloqueadaPor) {
      return res.status(409).json({
        erro: `Este item tem ${plural(resultado.bloqueadaPor)}. Edite ou exclua esses lançamentos antes de excluir.`,
      });
    }
    return res.status(204).end();
  } catch (erro) {
    return next(erro);
  }
});

export default router;

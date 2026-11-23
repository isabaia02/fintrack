import { Router } from 'express';
import { autenticar } from '../middlewares/autenticar.js';
import { buscarFaturas } from '../models/faturasCartao.js';
import { hojeIso } from '../utils/periodo.js';
import { validarMeses, validarPeriodo } from '../middlewares/validarRelatorio.js';
import * as Relatorio from '../models/relatorio.js';

const router = Router();
router.use(autenticar);

router.get('/faturas', validarMeses, async (req, res, next) => {
  try {
    res.json({ cartoes: await buscarFaturas(req.usuarioId, { meses: req.meses, hoje: hojeIso() }) });
  } catch (erro) {
    next(erro);
  }
});

router.get('/categorias', validarPeriodo, async (req, res, next) => {
  try {
    res.json(await Relatorio.porCategoria(req.usuarioId, req.periodo));
  } catch (erro) {
    next(erro);
  }
});

router.get('/fontes-destinos', validarPeriodo, async (req, res, next) => {
  try {
    res.json(await Relatorio.porFonteDestino(req.usuarioId, req.periodo));
  } catch (erro) {
    next(erro);
  }
});

export default router;

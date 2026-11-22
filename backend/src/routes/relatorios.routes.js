import { Router } from 'express';
import { autenticar } from '../middlewares/autenticar.js';
import { buscarFaturas } from '../models/faturasCartao.js';
import { hojeIso } from '../utils/periodo.js';

const router = Router();
router.use(autenticar);

const MESES_PADRAO = 3;
const MESES_MAXIMO = 24;

router.get('/faturas', async (req, res, next) => {
  let meses = MESES_PADRAO;
  if (req.query.meses !== undefined && req.query.meses !== '') {
    const valor = String(req.query.meses);
    meses = /^\d+$/.test(valor) ? Number(valor) : NaN;
    if (!(meses >= 0 && meses <= MESES_MAXIMO)) {
      return res.status(400).json({
        erro: 'Dados inválidos.',
        campos: { meses: `Informe um número inteiro de 0 a ${MESES_MAXIMO}.` },
      });
    }
  }

  try {
    const cartoes = await buscarFaturas(req.usuarioId, { meses, hoje: hojeIso() });
    return res.json({ cartoes });
  } catch (erro) {
    return next(erro);
  }
});

export default router;

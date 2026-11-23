import { Router } from 'express';
import { autenticar } from '../middlewares/autenticar.js';
import { buscarSaudeFinanceira } from '../models/saudeFinanceira.js';
import { gerarDicasIa } from '../services/iaDicas.js';
import { hojeIso } from '../utils/periodo.js';

export function criarRotas({ gerarDicas = gerarDicasIa } = {}) {
  const router = Router();
  router.use(autenticar);

  router.get('/', async (req, res, next) => {
    try {
      res.json(await buscarSaudeFinanceira(req.usuarioId, { hoje: hojeIso(), gerarDicasIa: gerarDicas }));
    } catch (erro) {
      next(erro);
    }
  });

  return router;
}

export default criarRotas();

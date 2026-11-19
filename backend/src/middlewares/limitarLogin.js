import { rateLimit } from 'express-rate-limit';

const LIMITE_PADRAO = 10;

export function lerLimite(valor) {
  const numero = Number.parseInt(valor, 10);
  return Number.isInteger(numero) && numero > 0 ? numero : LIMITE_PADRAO;
}

export const limitarLogin = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: lerLimite(process.env.LOGIN_RATE_LIMIT_MAX),
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({ erro: 'Muitas tentativas. Tente novamente em alguns minutos.' });
  },
});

import { rateLimit } from 'express-rate-limit';

// Só tentativas com falha contam; um login válido não consome o limite.
export const limitarLogin = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.LOGIN_RATE_LIMIT_MAX ?? 10),
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({ erro: 'Muitas tentativas. Tente novamente em alguns minutos.' });
  },
});

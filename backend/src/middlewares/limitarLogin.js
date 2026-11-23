import { rateLimit } from 'express-rate-limit';

const LIMITE_PADRAO = 10;
const LIMITE_CADASTRO_PADRAO = 20;

export function lerLimite(valor, padrao = LIMITE_PADRAO) {
  const numero = Number.parseInt(valor, 10);
  return Number.isInteger(numero) && numero > 0 ? numero : padrao;
}

function criarLimitador({ janelaMs, limite, mensagem, soErros }) {
  return rateLimit({
    windowMs: janelaMs,
    limit: limite,
    skipSuccessfulRequests: soErros,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (req, res) => res.status(429).json({ erro: mensagem }),
  });
}

export const limitarLogin = criarLimitador({
  janelaMs: 15 * 60 * 1000,
  limite: lerLimite(process.env.LOGIN_RATE_LIMIT_MAX),
  mensagem: 'Muitas tentativas. Tente novamente em alguns minutos.',
  soErros: true,
});

export const limitarCadastro = criarLimitador({
  janelaMs: 60 * 60 * 1000,
  limite: lerLimite(process.env.CADASTRO_RATE_LIMIT_MAX, LIMITE_CADASTRO_PADRAO),
  mensagem: 'Muitas tentativas de cadastro. Tente novamente mais tarde.',
  soErros: false,
});

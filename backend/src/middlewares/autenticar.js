import jwt from 'jsonwebtoken';
import { ALGORITMO_JWT, jwtConfig } from '../config/jwt.js';

export function autenticar(req, res, next) {
  const [esquema, token] = (req.headers.authorization ?? '').split(' ');
  if (esquema !== 'Bearer' || !token) {
    return res.status(401).json({ erro: 'Token não informado.' });
  }

  let segredo;
  try {
    segredo = jwtConfig.secret;
  } catch (erro) {
    return next(erro);
  }

  try {
    const payload = jwt.verify(token, segredo, { algorithms: [ALGORITMO_JWT] });
    const usuarioId = Number(payload.sub);
    if (!Number.isInteger(usuarioId)) {
      return res.status(401).json({ erro: 'Token inválido.' });
    }
    req.usuarioId = usuarioId;
    return next();
  } catch (erro) {
    if (erro instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ erro: 'Sua sessão expirou. Entre novamente.', codigo: 'SESSAO_EXPIRADA' });
    }
    return res.status(401).json({ erro: 'Token inválido.' });
  }
}

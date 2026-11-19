import jwt from 'jsonwebtoken';
import { jwtConfig } from '../config/jwt.js';

export function autenticar(req, res, next) {
  const [esquema, token] = (req.headers.authorization ?? '').split(' ');
  if (esquema !== 'Bearer' || !token) {
    return res.status(401).json({ erro: 'Token não informado.' });
  }
  try {
    const payload = jwt.verify(token, jwtConfig.secret);
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

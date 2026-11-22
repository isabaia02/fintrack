import { lerPeriodo } from '../utils/periodo.js';

export function validarPeriodo(req, res, next) {
  const campos = {};
  const periodo = lerPeriodo(req.query ?? {}, campos);
  if (Object.keys(campos).length) return res.status(400).json({ erro: 'Dados inválidos.', campos });
  req.periodo = periodo;
  return next();
}

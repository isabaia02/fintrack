import { lerPeriodo } from '../utils/periodo.js';

export function validarPeriodo(req, res, next) {
  const campos = {};
  const periodo = lerPeriodo(req.query ?? {}, campos);
  if (Object.keys(campos).length) return res.status(400).json({ erro: 'Dados inválidos.', campos });
  req.periodo = periodo;
  return next();
}

const MESES_PADRAO = 3;
const MESES_MAXIMO = 24;

export function validarMeses(req, res, next) {
  const bruto = req.query?.meses;
  let meses = MESES_PADRAO;
  if (bruto !== undefined && bruto !== '') {
    const valor = String(bruto);
    meses = /^\d+$/.test(valor) ? Number(valor) : NaN;
    if (!(meses >= 0 && meses <= MESES_MAXIMO)) {
      return res.status(400).json({
        erro: 'Dados inválidos.',
        campos: { meses: `Informe um número inteiro de 0 a ${MESES_MAXIMO}.` },
      });
    }
  }
  req.meses = meses;
  return next();
}

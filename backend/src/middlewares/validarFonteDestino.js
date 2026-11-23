import { limparTexto } from '../utils/texto.js';

export const TIPOS_FONTE_DESTINO = ['renda', 'conta', 'cartao_credito'];

const LIMITE_MAXIMO = 9_999_999_999.99; 
const diaValido = (v) => Number.isInteger(v) && v >= 1 && v <= 31;

function limiteValido(v) {
  if (typeof v !== 'number' || !Number.isFinite(v) || v <= 0 || v > LIMITE_MAXIMO) return false;
  return Math.abs(v * 100 - Math.round(v * 100)) < 1e-6; // no máximo 2 casas decimais
}

export function validarFonteDestino(req, res, next) {
  const corpo = req.body ?? {};
  const nome = limparTexto(corpo.nome);
  const { tipo } = corpo;
  const campos = {};

  if (!nome) campos.nome = 'Informe o nome.';
  else if (nome.length > 60) campos.nome = 'O nome deve ter no máximo 60 caracteres.';

  if (tipo === undefined || tipo === null || tipo === '') {
    campos.tipo = 'Informe o tipo (renda, conta ou cartão de crédito).';
  } else if (!TIPOS_FONTE_DESTINO.includes(tipo)) {
    campos.tipo = 'O tipo deve ser "renda", "conta" ou "cartao_credito".';
  }

  if (corpo.reserva !== undefined && corpo.reserva !== null && typeof corpo.reserva !== 'boolean') {
    campos.reserva = 'O campo reserva deve ser verdadeiro ou falso.';
  }

  if (tipo === 'cartao_credito') {
    if (corpo.dia_fechamento === undefined || corpo.dia_fechamento === null || corpo.dia_fechamento === '') {
      campos.dia_fechamento = 'Informe o dia de fechamento.';
    } else if (!diaValido(corpo.dia_fechamento)) {
      campos.dia_fechamento = 'O dia de fechamento deve ser um número inteiro de 1 a 31.';
    }

    if (corpo.dia_vencimento === undefined || corpo.dia_vencimento === null || corpo.dia_vencimento === '') {
      campos.dia_vencimento = 'Informe o dia de vencimento.';
    } else if (!diaValido(corpo.dia_vencimento)) {
      campos.dia_vencimento = 'O dia de vencimento deve ser um número inteiro de 1 a 31.';
    }

    if (corpo.limite === undefined || corpo.limite === null || corpo.limite === '') {
      campos.limite = 'Informe o limite do cartão.';
    } else if (!limiteValido(corpo.limite)) {
      campos.limite = 'O limite deve ser um número maior que zero, com até 2 casas decimais.';
    }
  }

  if (Object.keys(campos).length) {
    return res.status(400).json({ erro: 'Dados inválidos.', campos });
  }

  const cartao = tipo === 'cartao_credito';
  req.dadosFonteDestino = {
    nome,
    tipo,
    dia_fechamento: cartao ? corpo.dia_fechamento : null,
    dia_vencimento: cartao ? corpo.dia_vencimento : null,
    limite: cartao ? corpo.limite : null,
    reserva: tipo === 'conta' ? corpo.reserva === true : false,
  };
  return next();
}

export function validarTipoFiltro(req, res, next) {
  const { tipo } = req.query;
  if (tipo !== undefined && !TIPOS_FONTE_DESTINO.includes(tipo)) {
    return res.status(400).json({
      erro: 'Dados inválidos.',
      campos: { tipo: 'O tipo deve ser "renda", "conta" ou "cartao_credito".' },
    });
  }
  return next();
}

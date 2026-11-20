import { MAX_PARCELAS } from '../models/parcelamento.js';
import { idValido } from '../utils/id.js';

export const TIPOS_LANCAMENTO = ['entrada', 'saida'];

const VALOR_MAXIMO = 9_999_999_999.99;
const vazio = (v) => v === undefined || v === null || v === '';

function dataValida(valor) {
  if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
  const ano = Number(valor.slice(0, 4));
  if (ano < 1900 || ano > 2100) return false;
  const data = new Date(`${valor}T00:00:00Z`);
  return !Number.isNaN(data.getTime()) && data.toISOString().slice(0, 10) === valor;
}

function erroValor(valor) {
  if (typeof valor !== 'number' || !Number.isFinite(valor) || valor <= 0) return 'O valor deve ser maior que zero.';
  if (Math.abs(valor * 100 - Math.round(valor * 100)) >= 1e-6) return 'O valor deve ter no máximo 2 casas decimais.';
  if (valor > VALOR_MAXIMO) return 'O valor informado é muito alto.';
  return null;
}

export function validarDadosLancamento(corpo = {}) {
  const campos = {};
  const { tipo, valor, data } = corpo;
  const descricao = typeof corpo.descricao === 'string' ? corpo.descricao.trim() : '';

  if (vazio(tipo)) campos.tipo = 'Informe o tipo (entrada ou saída).';
  else if (!TIPOS_LANCAMENTO.includes(tipo)) campos.tipo = 'O tipo deve ser "entrada" ou "saida".';

  const mensagemValor = erroValor(valor);
  if (mensagemValor) campos.valor = mensagemValor;

  if (!descricao) campos.descricao = 'Informe a descrição.';
  else if (descricao.length > 120) campos.descricao = 'A descrição deve ter no máximo 120 caracteres.';

  if (vazio(data)) campos.data = 'Informe a data.';
  else if (!dataValida(data)) campos.data = 'Informe uma data válida.';

  const categoriaId = idValido(corpo.categoriaId);
  if (vazio(corpo.categoriaId)) campos.categoriaId = 'Selecione uma categoria.';
  else if (!categoriaId) campos.categoriaId = 'Categoria não encontrada.';

  const fonteDestinoId = idValido(corpo.fonteDestinoId);
  if (vazio(corpo.fonteDestinoId)) campos.fonteDestinoId = 'Selecione uma fonte ou destino.';
  else if (!fonteDestinoId) campos.fonteDestinoId = 'Fonte ou destino não encontrado.';

  const parcelasInformadas = !vazio(corpo.parcelas);
  if (parcelasInformadas
    && (!Number.isInteger(corpo.parcelas) || corpo.parcelas < 1 || corpo.parcelas > MAX_PARCELAS)) {
    campos.parcelas = `O número de parcelas deve ser um inteiro de 1 a ${MAX_PARCELAS}.`;
  }

  return {
    campos,
    dados: {
      tipo,
      valor,
      descricao,
      data,
      categoriaId,
      fonteDestinoId,
      parcelas: parcelasInformadas && !campos.parcelas ? corpo.parcelas : null,
    },
  };
}

export function responderInvalido(res, campos) {
  return res.status(400).json({ erro: 'Dados inválidos.', campos });
}

export function validarExclusao(req, res, next) {
  const { todasParcelas } = req.query;
  if (todasParcelas !== undefined && todasParcelas !== 'true' && todasParcelas !== 'false') {
    return responderInvalido(res, { todasParcelas: 'Use "true" ou "false".' });
  }
  req.todasParcelas = todasParcelas === 'true';
  return next();
}

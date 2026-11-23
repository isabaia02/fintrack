import { MAX_PARCELAS } from '../models/parcelamento.js';
import { idValido } from '../utils/id.js';
import { dataValida, lerPeriodo } from '../utils/periodo.js';
import { limparTexto } from '../utils/texto.js';

export const TIPOS_LANCAMENTO = ['entrada', 'saida'];

const VALOR_MAXIMO = 9_999_999_999.99;
const vazio = (v) => v === undefined || v === null || v === '';

function erroValor(valor) {
  if (typeof valor !== 'number' || !Number.isFinite(valor) || valor <= 0) return 'O valor deve ser maior que zero.';
  if (Math.abs(valor * 100 - Math.round(valor * 100)) >= 1e-6) return 'O valor deve ter no máximo 2 casas decimais.';
  if (valor > VALOR_MAXIMO) return 'O valor informado é muito alto.';
  return null;
}

export function validarDadosLancamento(corpo = {}) {
  const campos = {};
  const { tipo, valor, data } = corpo;
  const descricao = limparTexto(corpo.descricao);

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

function lerId(valor, campo, mensagem, campos) {
  if (vazio(valor)) return null;
  const id = idValido(valor);
  if (!id) campos[campo] = mensagem;
  return id;
}

export function validarFiltrosLancamento(req, res, next) {
  const consulta = req.query ?? {};
  const campos = {};
  const { inicio, fim } = lerPeriodo(consulta, campos);

  const { tipo } = consulta;
  if (!vazio(tipo) && !TIPOS_LANCAMENTO.includes(tipo)) campos.tipo = 'O tipo deve ser "entrada" ou "saida".';

  const categoriaId = lerId(consulta.categoriaId, 'categoriaId', 'Categoria inválida.', campos);
  const fonteDestinoId = lerId(consulta.fonteDestinoId, 'fonteDestinoId', 'Fonte ou destino inválido.', campos);

  let pagina = 1;
  if (!vazio(consulta.pagina)) {
    pagina = idValido(consulta.pagina);
    if (!pagina) campos.pagina = 'A página deve ser um número inteiro maior que zero.';
  }

  if (Object.keys(campos).length) return responderInvalido(res, campos);

  req.filtros = { inicio, fim, tipo: vazio(tipo) ? null : tipo, categoriaId, fonteDestinoId, pagina };
  return next();
}

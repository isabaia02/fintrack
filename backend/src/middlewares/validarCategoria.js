import { limparTexto } from '../utils/texto.js';

const TIPOS = ['entrada', 'saida'];

function validar({ tipoObrigatorio }) {
  return (req, res, next) => {
    const corpo = req.body ?? {};
    const nome = limparTexto(corpo.nome);
    const campos = {};

    if (!nome) campos.nome = 'Informe o nome da categoria.';
    else if (nome.length > 60) campos.nome = 'O nome deve ter no máximo 60 caracteres.';

    if (corpo.tipo === undefined || corpo.tipo === null || corpo.tipo === '') {
      if (tipoObrigatorio) campos.tipo = 'Informe o tipo (entrada ou saída).';
    } else if (!TIPOS.includes(corpo.tipo)) {
      campos.tipo = 'O tipo deve ser "entrada" ou "saida".';
    }

    if (Object.keys(campos).length) {
      return res.status(400).json({ erro: 'Dados inválidos.', campos });
    }

    req.dadosCategoria = { nome, tipo: corpo.tipo || undefined };
    return next();
  };
}

export const validarCriacaoCategoria = validar({ tipoObrigatorio: true });
export const validarEdicaoCategoria = validar({ tipoObrigatorio: false });

export function validarTipoFiltro(req, res, next) {
  const { tipo } = req.query;
  if (tipo !== undefined && !TIPOS.includes(tipo)) {
    return res.status(400).json({
      erro: 'Dados inválidos.',
      campos: { tipo: 'O tipo deve ser "entrada" ou "saida".' },
    });
  }
  return next();
}

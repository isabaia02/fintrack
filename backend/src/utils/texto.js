export const texto = (valor) => (typeof valor === 'string' ? valor : '');

export const normalizarEmail = (valor) => texto(valor).trim().toLowerCase();

const CONTROLE = /[\u0000-\u001f\u007f]/;
const CONTROLE_GLOBAL = /[\u0000-\u001f\u007f]/g;

export const temControle = (valor) => CONTROLE.test(valor);

export const limparTexto = (valor) => texto(valor).replace(CONTROLE_GLOBAL, '').trim();

export const texto = (valor) => (typeof valor === 'string' ? valor : '');

export const normalizarEmail = (valor) => texto(valor).trim().toLowerCase();

const ESPACO_CONTROLE = /[\t\n\r\v\f]+/g;
const CONTROLE = /[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/;
const CONTROLE_GLOBAL = new RegExp(CONTROLE.source, 'g');

export const temControle = (valor) => CONTROLE.test(valor);

export const limparTexto = (valor) => texto(valor)
  .replace(ESPACO_CONTROLE, ' ')
  .replace(CONTROLE_GLOBAL, '')
  .replace(/ {2,}/g, ' ')
  .trim();

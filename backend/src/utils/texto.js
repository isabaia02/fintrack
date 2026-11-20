export const texto = (valor) => (typeof valor === 'string' ? valor : '');

export const normalizarEmail = (valor) => texto(valor).trim().toLowerCase();

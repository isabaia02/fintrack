const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const emailValido = (texto) => REGEX_EMAIL.test(texto.trim());

export const senhaValida = (texto) => texto.length >= 8 && /[A-Za-z]/.test(texto) && /\d/.test(texto);

export const apenasDigitos = (texto) => texto.replace(/\D/g, '');

const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const LIMITE_NOME = 120;
export const LIMITE_EMAIL = 160;
export const LIMITE_SENHA_BYTES = 72;

export const apenasDigitos = (texto) => texto.replace(/\D/g, '');

export const emailValido = (texto) => {
  const email = texto.trim();
  return REGEX_EMAIL.test(email) && email.length <= LIMITE_EMAIL;
};

export const senhaValida = (texto) => texto.length >= 8 && /[A-Za-z]/.test(texto) && /\d/.test(texto);

export const senhaCabeNoLimite = (texto) => new TextEncoder().encode(texto).length <= LIMITE_SENHA_BYTES;

export function cpfValido(texto) {
  const digitos = apenasDigitos(texto);
  if (digitos.length !== 11 || /^(\d)\1{10}$/.test(digitos)) return false;

  const digitoVerificador = (tamanho) => {
    let soma = 0;
    for (let i = 0; i < tamanho; i++) soma += Number(digitos[i]) * (tamanho + 1 - i);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };

  return digitoVerificador(9) === Number(digitos[9]) && digitoVerificador(10) === Number(digitos[10]);
}

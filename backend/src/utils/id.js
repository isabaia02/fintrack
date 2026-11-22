const ID_MAX = 2147483647;

// Converte o :id da rota em inteiro positivo; devolve null se for malformado ou fora do intervalo.
export function idValido(valor) {
  const id = Number(valor);
  return /^\d+$/.test(String(valor)) && id >= 1 && id <= ID_MAX ? id : null;
}

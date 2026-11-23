const MESES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

export const paraCentavos = (valor) => Math.round(valor * 100);
export const paraReais = (centavos) => centavos / 100;

export const nomeMes = (referencia) => MESES[Number(referencia.slice(5, 7)) - 1];

export function somarMesesRef(referencia, meses) {
  const [ano, mes] = referencia.split('-').map(Number);
  return new Date(Date.UTC(ano, mes - 1 + meses, 1)).toISOString().slice(0, 7);
}

export function diasNoMes(referencia) {
  const [ano, mes] = referencia.split('-').map(Number);
  return new Date(Date.UTC(ano, mes, 0)).getUTCDate();
}

export const arredondar = (numero, casas = 1) => {
  const fator = 10 ** casas;
  return Math.round(numero * fator) / fator;
};

const numero = (casas) => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: casas });
const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export const formatarNumero = (valor, casas = 1) => numero(casas).format(valor);
export const formatarPercentual = (valor, casas = 0) => `${numero(casas).format(valor)}%`;
export const formatarMoeda = (valor) => moeda.format(valor).replace(/ /g, ' ');

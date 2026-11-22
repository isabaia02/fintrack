import { formatarMoeda } from './formatadores';

export const MAX_PARCELAS = 48;

export function dividirEmParcelas(valor, quantidade) {
  const centavos = Math.round(valor * 100);
  const base = Math.floor(centavos / quantidade);
  const resto = centavos - base * quantidade;
  return Array.from({ length: quantidade }, (_, i) => (base + (i === 0 ? resto : 0)) / 100);
}

export function resumirParcelas(valor, quantidade) {
  const [primeira, ...demais] = dividirEmParcelas(valor, quantidade);
  if (demais.every((v) => v === primeira)) return `${quantidade}× ${formatarMoeda(primeira)}`;
  return `1× ${formatarMoeda(primeira)} + ${demais.length}× ${formatarMoeda(demais[0])}`;
}

function ultimoDiaDoMes(ano, mes) {
  return new Date(Date.UTC(ano, mes + 1, 0)).getUTCDate();
}

function dataSegura(ano, mes, dia) {
  const a = ano + Math.floor(mes / 12);
  const m = ((mes % 12) + 12) % 12;
  return new Date(Date.UTC(a, m, Math.min(dia, ultimoDiaDoMes(a, m))));
}

export function calcularFatura(dataCompra, { diaFechamento, diaVencimento }) {
  const [ano, mes, dia] = dataCompra.split('-').map(Number);
  const m = mes - 1;
  const mesFechamento = dia < Math.min(diaFechamento, ultimoDiaDoMes(ano, m)) ? m : m + 1;
  const mesVencimento = diaVencimento > diaFechamento ? mesFechamento : mesFechamento + 1;
  const vencimento = dataSegura(ano, mesVencimento, diaVencimento).toISOString().slice(0, 10);
  const [anoVenc, mesVenc, diaVenc] = vencimento.split('-');
  return { referencia: `${mesVenc}/${anoVenc}`, vencimento: `${diaVenc}/${mesVenc}` };
}

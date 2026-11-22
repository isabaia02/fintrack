const DIA = 86_400_000;
const FUSO_HORARIO = 'America/Sao_Paulo';

const vazio = (v) => v === undefined || v === null || v === '';
const paraData = (iso) => new Date(`${iso}T00:00:00Z`);
const paraIso = (data) => data.toISOString().slice(0, 10);
const somarDias = (iso, dias) => paraIso(new Date(paraData(iso).getTime() + dias * DIA));

export function dataValida(valor) {
  if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
  const ano = Number(valor.slice(0, 4));
  if (ano < 1900 || ano > 2100) return false;
  const data = paraData(valor);
  return !Number.isNaN(data.getTime()) && paraIso(data) === valor;
}

export function mesCorrente(hoje = new Date()) {
  const [ano, mes] = new Intl.DateTimeFormat('en-CA', { timeZone: FUSO_HORARIO, year: 'numeric', month: '2-digit' })
    .format(hoje)
    .split('-')
    .map(Number);
  return { inicio: paraIso(new Date(Date.UTC(ano, mes - 1, 1))), fim: paraIso(new Date(Date.UTC(ano, mes, 0))) };
}

export function lerPeriodo(consulta, campos) {
  const padrao = mesCorrente();
  const inicio = vazio(consulta.inicio) ? padrao.inicio : consulta.inicio;
  const fim = vazio(consulta.fim) ? padrao.fim : consulta.fim;
  if (!dataValida(inicio)) campos.inicio = 'Informe uma data inicial válida (AAAA-MM-DD).';
  if (!dataValida(fim)) campos.fim = 'Informe uma data final válida (AAAA-MM-DD).';
  if (!campos.inicio && !campos.fim && inicio > fim) {
    campos.fim = 'A data final deve ser igual ou posterior à data inicial.';
  }
  return { inicio, fim };
}

function mesesInteiros(inicio, fim) {
  if (inicio.slice(8) !== '01' || somarDias(fim, 1).slice(8) !== '01') return 0;
  const [anoInicio, mesInicio] = inicio.split('-').map(Number);
  const [anoFim, mesFim] = fim.split('-').map(Number);
  return (anoFim - anoInicio) * 12 + (mesFim - mesInicio) + 1;
}

export function periodoAnterior(inicio, fim) {
  const meses = mesesInteiros(inicio, fim);
  const [ano, mes] = inicio.split('-').map(Number);
  const dias = (paraData(fim) - paraData(inicio)) / DIA + 1;
  return {
    inicio: meses ? paraIso(new Date(Date.UTC(ano, mes - 1 - meses, 1))) : somarDias(inicio, -dias),
    fim: somarDias(inicio, -1),
  };
}

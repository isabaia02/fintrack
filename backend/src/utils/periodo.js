const FUSO_HORARIO = 'America/Sao_Paulo';

const vazio = (v) => v === undefined || v === null || v === '';
const paraData = (iso) => new Date(`${iso}T00:00:00Z`);
const paraIso = (data) => data.toISOString().slice(0, 10);

export function dataValida(valor) {
  if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
  const ano = Number(valor.slice(0, 4));
  if (ano < 1900 || ano > 2100) return false;
  const data = paraData(valor);
  return !Number.isNaN(data.getTime()) && paraIso(data) === valor;
}

// Data de hoje (AAAA-MM-DD) no fuso de São Paulo, independente do fuso do servidor.
export function hojeIso(agora = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: FUSO_HORARIO, year: 'numeric', month: '2-digit', day: '2-digit' })
    .format(agora);
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

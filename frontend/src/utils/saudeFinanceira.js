import { formatarMoeda, formatarVariacao } from './formatadores';

export const STATUS = {
  bom: { rotulo: 'Bom', tom: 'entrada' },
  atencao: { rotulo: 'Atenção', tom: 'alerta' },
  alerta: { rotulo: 'Alerta', tom: 'alerta' },
  info: { rotulo: 'Informativo', tom: 'neutro' },
};

export function seloDoIndicador(indicador) {
  if (indicador.id === 'regra_50_30_20' && (indicador.status === 'atencao' || indicador.status === 'alerta')) {
    return { rotulo: 'Fora da meta', tom: 'alerta' };
  }
  return STATUS[indicador.status] ?? STATUS.info;
}

const numero = (valor, casas) => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: casas }).format(valor).replace('-', '−');

export function formatarValorIndicador({ valor, unidade }) {
  if (valor === null || valor === undefined) return '—';
  switch (unidade) {
    case 'percentual': return `${numero(valor, 1)}%`;
    case 'meses': return `${numero(valor, 1)} ${valor === 1 ? 'mês' : 'meses'}`;
    case 'reais': return formatarMoeda(valor).replace(/,00$/, '');
    case 'variacao': return formatarVariacao(valor);
    case 'proporcao': return `${valor.necessidades}/${valor.desejos}/${valor.poupanca}`;
    default: return String(valor);
  }
}

const partes = (referencia) => {
  const [ano, mes] = referencia.split('-').map(Number);
  return { ano, mes };
};
const dataDaReferencia = (referencia) => {
  const { ano, mes } = partes(referencia);
  return new Date(Date.UTC(ano, mes - 1, 1));
};
const capitalizar = (texto) => `${texto.charAt(0).toUpperCase()}${texto.slice(1)}`;

export function rotuloMesAno(referencia) {
  const mes = dataDaReferencia(referencia).toLocaleDateString('pt-BR', { month: 'long', timeZone: 'UTC' });
  return `${capitalizar(mes)} ${partes(referencia).ano}`;
}

export function rotuloMesCurto(referencia) {
  const mes = dataDaReferencia(referencia).toLocaleDateString('pt-BR', { month: 'short', timeZone: 'UTC' });
  return capitalizar(mes.replace('.', ''));
}

export function mesPorExtenso(referencia) {
  const mes = dataDaReferencia(referencia).toLocaleDateString('pt-BR', { month: 'long', timeZone: 'UTC' });
  return `${mes} de ${partes(referencia).ano}`;
}

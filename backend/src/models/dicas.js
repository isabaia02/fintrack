import { LIMITES } from './indicadores.js';
import { formatarMoeda, formatarPercentual, nomeMes } from '../utils/formato.js';

export const MAX_DICAS_REGRAS = 5;
const USO_ALTO_DO_LIMITE = 70;

export function gerarDicasPorRegras({ indicadores, contexto, projecao }) {
  const por = Object.fromEntries(indicadores.map((i) => [i.id, i]));
  const dicas = [];
  const dica = (id, texto) => dicas.push({ id, texto, origem: 'regras' });

  if (projecao.fica_negativo) {
    dica('saldo_negativo',
      `Mantendo o ritmo atual, seu saldo fica negativo em ${nomeMes(projecao.primeiro_mes_negativo)}. Reduza gastos variáveis ou antecipe receitas antes disso.`);
  }

  const poupanca = por.taxa_poupanca;
  if (poupanca.status === 'alerta' || poupanca.status === 'atencao') {
    const guardar = contexto.renda * (LIMITES.poupancaMeta / 100);
    dica('poupanca',
      guardar > 0
        ? `Separe ${LIMITES.poupancaMeta}% do salário assim que ele cair (${formatarMoeda(guardar)}). Assim a poupança chega perto da meta.`
        : `Separe ${LIMITES.poupancaMeta}% do salário assim que ele cair. Assim a poupança chega perto da meta.`);
  }

  const cartaoCheio = [...contexto.cartoes]
    .filter((c) => c.percentualDoLimite >= USO_ALTO_DO_LIMITE)
    .sort((a, b) => b.percentualDoLimite - a.percentualDoLimite)[0];
  if (cartaoCheio) {
    dica('limite_cartao',
      `Evite novas parcelas no ${cartaoCheio.nome}: ele já usa ${formatarPercentual(cartaoCheio.percentualDoLimite)} do limite.`);
  } else if (por.comprometimento_cartoes.status === 'alerta') {
    dica('faturas', 'Suas próximas faturas pesam na renda. Evite novas compras no crédito até elas diminuírem.');
  }

  if (contexto.foraDaCurva && ['atencao', 'alerta'].includes(por.categoria_fora_da_curva.status)) {
    dica('fora_da_curva',
      `${contexto.foraDaCurva.categoria} subiu mais que o resto. Vale revisar os gastos dessa categoria.`);
  }

  const reserva = por.reserva_emergencia;
  if (reserva.status === 'alerta' || reserva.status === 'atencao') {
    const alvo = contexto.despesaMediaMensal * LIMITES.reservaBom;
    const falta = Math.max(0, alvo - (contexto.reservaSaldo ?? 0));
    dica('reserva',
      `Direcione parte do que sobra para a reserva de emergência: faltam ${formatarMoeda(falta)} para cobrir ${LIMITES.reservaBom} meses de despesas.`);
  }

  if (['atencao', 'alerta'].includes(por.regra_50_30_20.status) && por.regra_50_30_20.valor) {
    const { necessidades, desejos } = por.regra_50_30_20.valor;
    if (necessidades > LIMITES.regra.necessidades) {
      dica('regra_necessidades', `Suas necessidades passam de ${LIMITES.regra.necessidades}% da renda. Veja se algum custo fixo pode ser renegociado.`);
    } else if (desejos > LIMITES.regra.desejos) {
      dica('regra_desejos', `Seus gastos com desejos passam de ${LIMITES.regra.desejos}% da renda. Escolha um deles para cortar este mês.`);
    }
  }

  if (dicas.length === 0) {
    dica('tudo_em_dia', 'Seus indicadores estão em dia. Continue registrando seus lançamentos para acompanhar a evolução.');
  }
  return dicas.slice(0, MAX_DICAS_REGRAS);
}

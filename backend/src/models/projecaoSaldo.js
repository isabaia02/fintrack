import { mediaDosMeses, resumoDoMes } from './indicadores.js';
import { diasNoMes, nomeMes, paraCentavos, paraReais, somarMesesRef } from '../utils/formato.js';

export const MESES_PROJECAO = 6;

export function projetarSaldo({ hoje, lancamentos, saldoInicial }) {
  const mes = hoje.slice(0, 7);
  const fechados = [1, 2, 3].map((k) => resumoDoMes(lancamentos, somarMesesRef(mes, -k)));
  const atual = resumoDoMes(lancamentos, mes);

  const aVista = (resumo) => ({
    ...resumo,
    gasto: resumo.saidas.filter((l) => l.total_parcelas === 1).reduce((s, l) => s + paraCentavos(l.valor), 0),
  });
  const rendaMedia = mediaDosMeses(fechados, 'renda') || atual.renda;
  const gastoMedio = mediaDosMeses(fechados.map(aVista), 'gasto') || aVista(atual).gasto;

  const parcelas = lancamentos.filter((l) => l.tipo === 'saida' && l.total_parcelas > 1);
  const diaHoje = Number(hoje.slice(8, 10));
  const fracaoRestante = (diasNoMes(mes) - diaHoje) / diasNoMes(mes);

  let saldo = paraCentavos(saldoInicial);
  const serie = [];
  for (let i = 0; i < MESES_PROJECAO; i += 1) {
    const ref = somarMesesRef(mes, i);
    const fator = i === 0 ? fracaoRestante : 1;
    const parcelasDoMes = parcelas
      .filter((l) => l.data.startsWith(ref) && (i > 0 || l.data > hoje))
      .reduce((s, l) => s + paraCentavos(l.valor), 0);
    saldo += Math.round((rendaMedia - gastoMedio) * fator) - parcelasDoMes;
    serie.push({ mes: ref, saldo: paraReais(saldo) });
  }

  const primeiroNegativo = serie.find((p) => p.saldo < 0) ?? null;
  return {
    saldo_inicial: saldoInicial,
    renda_mensal_estimada: paraReais(Math.round(rendaMedia)),
    gasto_mensal_estimado: paraReais(Math.round(gastoMedio)),
    serie,
    fica_negativo: primeiroNegativo !== null,
    primeiro_mes_negativo: primeiroNegativo?.mes ?? null,
    mensagem: primeiroNegativo
      ? `Mantendo o ritmo atual, seu saldo fica negativo em ${nomeMes(primeiroNegativo.mes)}.`
      : 'Mantendo o ritmo atual, seu saldo não fica negativo nos próximos 6 meses.',
  };
}

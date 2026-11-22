import {
  arredondar, formatarMoeda, formatarNumero, formatarPercentual,
  nomeMes, paraCentavos, paraReais, somarMesesRef,
} from '../utils/formato.js';

// Limites usados nos status (documentados no README).
export const LIMITES = {
  poupancaMeta: 10,           // % da renda: abaixo de 5% é alerta, de 5% a 10% é atenção
  poupancaAlerta: 5,
  cartoesBom: 30,             // % da renda: até 30% bom, até 70% atenção, acima disso alerta
  cartoesAlerta: 70,
  reservaBom: 3,              // meses de despesa: >= 3 bom, >= 2 atenção, abaixo disso alerta
  reservaAtencao: 2,
  regra: { necessidades: 50, desejos: 30, poupanca: 20 },
  foraDaCurvaAtencao: 10,     // % de alta sobre o mês anterior: >= 10 atenção, >= 30 alerta
  foraDaCurvaAlerta: 30,
  foraDaCurvaBase: 50,        // gasto mínimo (R$) no mês anterior para a comparação valer
  cartoesMeses: 3,
};

const NECESSIDADES = new Set([
  'moradia', 'alimentacao', 'saude', 'educacao', 'mobilidade', 'transporte',
  'aluguel', 'condominio', 'mercado', 'supermercado', 'contas', 'impostos',
]);
const semAcento = (texto) => texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
export const ehNecessidade = (categoria) => NECESSIDADES.has(semAcento(categoria));

const somar = (itens) => itens.reduce((total, l) => total + paraCentavos(l.valor), 0);
const indicador = (id, titulo, valor, unidade, status, mensagem) => ({ id, titulo, valor, unidade, status, mensagem });

export function mediaDosMeses(meses, campo) {
  const comMovimento = meses.filter((m) => m[campo] > 0);
  return comMovimento.length ? comMovimento.reduce((s, m) => s + m[campo], 0) / comMovimento.length : 0;
}

export function resumoDoMes(lancamentos, ref) {
  const doMes = lancamentos.filter((l) => l.data.startsWith(ref));
  const entradas = doMes.filter((l) => l.tipo === 'entrada');
  const saidas = doMes.filter((l) => l.tipo === 'saida');
  const porCategoria = new Map();
  for (const l of saidas) {
    porCategoria.set(l.categoria, (porCategoria.get(l.categoria) ?? 0) + paraCentavos(l.valor));
  }
  return { renda: somar(entradas), gasto: somar(saidas), saidas, porCategoria };
}

function taxaDePoupanca(mes, atual) {
  const titulo = 'Taxa de poupança';
  const nome = nomeMes(mes);
  if (atual.renda === 0) {
    return indicador('taxa_poupanca', titulo, null, 'percentual', 'info',
      `Você ainda não registrou nenhuma entrada em ${nome}. Registre sua renda para calcular quanto você guarda.`);
  }
  const taxa = arredondar(((atual.renda - atual.gasto) / atual.renda) * 100);
  const meta = LIMITES.poupancaMeta;
  if (taxa < 0) {
    return indicador('taxa_poupanca', titulo, taxa, 'percentual', 'alerta',
      `Em ${nome} você gastou ${formatarMoeda(paraReais(atual.gasto - atual.renda))} a mais do que recebeu. Uma meta comum é guardar pelo menos ${meta}% da renda.`);
  }
  if (taxa >= meta) {
    return indicador('taxa_poupanca', titulo, taxa, 'percentual', 'bom',
      `Você guardou ${formatarPercentual(taxa)} da sua renda em ${nome}. A meta comum é guardar pelo menos ${meta}%, e você está dentro dela.`);
  }
  const status = taxa >= LIMITES.poupancaAlerta ? 'atencao' : 'alerta';
  return indicador('taxa_poupanca', titulo, taxa, 'percentual', status,
    `Você guardou ${formatarPercentual(taxa)} da sua renda em ${nome}. Uma meta comum é guardar pelo menos ${meta}%.`);
}

function comprometimentoComCartoes(mes, atual, cartoes) {
  const titulo = 'Comprometimento com cartões';
  if (cartoes.length === 0) {
    return indicador('comprometimento_cartoes', titulo, null, 'percentual', 'info',
      'Você não tem cartão de crédito cadastrado, então não há faturas para comparar com a renda.');
  }
  const total = cartoes.reduce(
    (soma, c) => soma + c.faturas.slice(0, LIMITES.cartoesMeses).reduce((s, f) => s + paraCentavos(f.total), 0),
    0,
  );
  if (atual.renda === 0) {
    return indicador('comprometimento_cartoes', titulo, null, 'percentual', 'info',
      `Suas faturas dos próximos ${LIMITES.cartoesMeses} meses somam ${formatarMoeda(paraReais(total))}, mas não há entradas em ${nomeMes(mes)} para comparar.`);
  }
  const exato = (total / atual.renda) * 100;
  const valor = arredondar(exato, 0);
  let status = 'bom';
  if (exato > LIMITES.cartoesAlerta) status = 'alerta';
  else if (exato > LIMITES.cartoesBom) status = 'atencao';
  return indicador('comprometimento_cartoes', titulo, valor, 'percentual', status,
    `Suas faturas dos próximos ${LIMITES.cartoesMeses} meses (${formatarMoeda(paraReais(total))}) comprometem ${formatarPercentual(valor)} da sua renda.`);
}

function reservaDeEmergencia(atual, anteriores, reserva) {
  const titulo = 'Reserva de emergência';
  if (!reserva.temConta) {
    return indicador('reserva_emergencia', titulo, null, 'meses', 'info',
      'Você ainda não marcou nenhuma conta como reserva de emergência. Marque uma em Fontes e destinos para acompanhar este indicador.');
  }
  const media = mediaDosMeses(anteriores, 'gasto') || atual.gasto;
  if (!media) {
    return indicador('reserva_emergencia', titulo, null, 'meses', 'info',
      'Ainda não há despesas registradas para estimar quantos meses sua reserva cobre.');
  }
  const exato = Math.max(0, paraCentavos(reserva.saldo)) / media;
  const meses = arredondar(exato);
  let status = 'alerta';
  if (exato >= LIMITES.reservaBom) status = 'bom';
  else if (exato >= LIMITES.reservaAtencao) status = 'atencao';
  const unidade = meses === 1 ? 'mês' : 'meses';
  return indicador('reserva_emergencia', titulo, meses, 'meses', status,
    `Sua reserva cobre ${formatarNumero(meses)} ${unidade} de despesas. Uma referência comum é de 3 a 6 meses.`);
}

function parcelasFuturas(mes, lancamentos) {
  const titulo = 'Parcelas futuras';
  const futuras = lancamentos.filter((l) => l.tipo === 'saida' && l.total_parcelas > 1 && l.data.slice(0, 7) > mes);
  if (futuras.length === 0) {
    return indicador('parcelas_futuras', titulo, 0, 'reais', 'info', 'Você não tem parcelas previstas para os próximos meses.');
  }
  const total = paraReais(somar(futuras));
  const ultimo = futuras.reduce((m, l) => (l.data.slice(0, 7) > m ? l.data.slice(0, 7) : m), mes);
  return indicador('parcelas_futuras', titulo, total, 'reais', 'info',
    `Você tem ${formatarMoeda(total)} em parcelas até ${nomeMes(ultimo)} de ${ultimo.slice(0, 4)}.`);
}

function regra503020(atual) {
  const titulo = 'Regra 50/30/20';
  if (atual.renda === 0) {
    return indicador('regra_50_30_20', titulo, null, 'proporcao', 'info',
      'Sem entradas no mês, não dá para dividir seus gastos entre necessidades, desejos e poupança. A referência é 50/30/20.');
  }
  const necessidades = atual.saidas.filter((l) => ehNecessidade(l.categoria));
  const pn = (somar(necessidades) / atual.renda) * 100;
  const pd = ((atual.gasto - somar(necessidades)) / atual.renda) * 100;
  const pp = Math.max(0, ((atual.renda - atual.gasto) / atual.renda) * 100);
  const { regra } = LIMITES;
  const fora = [pn > regra.necessidades, pd > regra.desejos, pp < regra.poupanca].filter(Boolean).length;
  const status = fora === 0 ? 'bom' : fora === 1 ? 'atencao' : 'alerta';
  const [n, d, p] = [pn, pd, pp].map((v) => Math.round(v));
  const mensagem = `Necessidades ${n}%, desejos ${d}% e poupança ${p}%. A referência é ${regra.necessidades}/${regra.desejos}/${regra.poupanca}.`;
  return indicador('regra_50_30_20', titulo, { necessidades: n, desejos: d, poupanca: p }, 'proporcao', status, mensagem);
}

function categoriaForaDaCurva(mes, atual, anterior) {
  const titulo = 'Categoria fora da curva';
  const base = paraCentavos(LIMITES.foraDaCurvaBase);
  let pior = null;
  for (const [categoria, antes] of anterior.porCategoria) {
    if (antes < base) continue;
    const variacao = (((atual.porCategoria.get(categoria) ?? 0) - antes) / antes) * 100;
    if (!pior || variacao > pior.variacao) pior = { categoria, variacao };
  }
  if (!pior) {
    return { item: indicador('categoria_fora_da_curva', titulo, null, 'variacao', 'info',
      `Ainda não há gastos suficientes em ${nomeMes(somarMesesRef(mes, -1))} para comparar categorias.`), pior };
  }
  const valor = arredondar(pior.variacao);
  const nome = pior.categoria.toLowerCase();
  if (valor < LIMITES.foraDaCurvaAtencao) {
    return { item: indicador('categoria_fora_da_curva', titulo, valor, 'variacao', 'bom',
      `Nenhuma categoria subiu mais de ${LIMITES.foraDaCurvaAtencao}% em relação ao mês anterior. A maior variação foi em ${nome} (${valor > 0 ? '+' : ''}${formatarNumero(valor)}%).`), pior: null };
  }
  const status = valor >= LIMITES.foraDaCurvaAlerta ? 'alerta' : 'atencao';
  return { item: indicador('categoria_fora_da_curva', titulo, valor, 'variacao', status,
    `Gastos com ${nome} subiram ${formatarNumero(valor)}% em relação ao mês anterior.`), pior };
}

export function calcularIndicadores({ hoje, lancamentos, reserva, cartoes }) {
  const mes = hoje.slice(0, 7);
  const atual = resumoDoMes(lancamentos, mes);
  const anterior = resumoDoMes(lancamentos, somarMesesRef(mes, -1));
  const fechados = [1, 2, 3].map((k) => resumoDoMes(lancamentos, somarMesesRef(mes, -k)));

  const foraDaCurva = categoriaForaDaCurva(mes, atual, anterior);
  const indicadores = [
    taxaDePoupanca(mes, atual),
    comprometimentoComCartoes(mes, atual, cartoes),
    reservaDeEmergencia(atual, fechados, reserva),
    parcelasFuturas(mes, lancamentos),
    regra503020(atual),
    foraDaCurva.item,
  ];
  const despesaMedia = mediaDosMeses(fechados, 'gasto') || atual.gasto;
  return {
    indicadores,
    contexto: {
      mes,
      renda: paraReais(atual.renda),
      despesaMediaMensal: paraReais(Math.round(despesaMedia)),
      reservaSaldo: reserva.temConta ? reserva.saldo : null,
      foraDaCurva: foraDaCurva.pior,
      cartoes: cartoes.map((c) => ({
        nome: c.nome,
        percentualDoLimite: c.limite > 0 ? (c.limite_utilizado / c.limite) * 100 : 0,
      })),
    },
  };
}

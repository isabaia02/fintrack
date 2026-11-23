export const ACAO_PADRAO = { rotulo: 'Novo lançamento', destino: '/lancamentos?novo=1' };

export const PAGINAS = [
  { caminho: '/', titulo: 'Resumo', icone: 'dashboard', periodo: true },
  { caminho: '/lancamentos', titulo: 'Lançamentos', icone: 'receipt_long' },
  { caminho: '/relatorios', titulo: 'Relatórios', icone: 'bar_chart', acao: null },
  { caminho: '/faturas', titulo: 'Faturas', icone: 'credit_card' },
  { caminho: '/saude-financeira', titulo: 'Saúde financeira', icone: 'health_and_safety' },
  { divisor: true },
  {
    caminho: '/categorias',
    titulo: 'Categorias',
    icone: 'category',
    acao: { rotulo: 'Nova categoria', destino: '/categorias?novo=1' },
  },
  {
    caminho: '/fontes-destinos',
    titulo: 'Fontes e destinos',
    icone: 'account_balance_wallet',
    acao: { rotulo: 'Nova fonte ou destino', destino: '/fontes-destinos?novo=1' },
  },
];

export const paginaDaRota = (caminho) => PAGINAS.find((p) => p.caminho === caminho);

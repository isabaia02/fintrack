export const PAGINAS = [
  { caminho: '/', titulo: 'Resumo', icone: 'dashboard', periodo: true },
  { caminho: '/lancamentos', titulo: 'Lançamentos', icone: 'receipt_long', periodo: true },
  { caminho: '/relatorios', titulo: 'Relatórios', icone: 'bar_chart', periodo: true },
  { caminho: '/faturas', titulo: 'Faturas', icone: 'credit_card' },
  { caminho: '/saude-financeira', titulo: 'Saúde financeira', icone: 'health_and_safety' },
  { divisor: true },
  { caminho: '/categorias', titulo: 'Categorias', icone: 'category' },
  { caminho: '/fontes-destinos', titulo: 'Fontes e destinos', icone: 'account_balance_wallet' },
];

export const paginaDaRota = (caminho) => PAGINAS.find((p) => p.caminho === caminho);

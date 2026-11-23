const iso = (ano, mes, dia) => new Date(Date.UTC(ano, mes, dia)).toISOString().slice(0, 10);

export function periodosPredefinidos(hoje = new Date()) {
  const ano = hoje.getFullYear();
  const mes = hoje.getMonth();
  return [
    { id: 'mes-atual', rotulo: 'Este mês', inicio: iso(ano, mes, 1), fim: iso(ano, mes + 1, 0) },
    { id: 'mes-anterior', rotulo: 'Mês anterior', inicio: iso(ano, mes - 1, 1), fim: iso(ano, mes, 0) },
    { id: 'ultimos-3-meses', rotulo: 'Últimos 3 meses', inicio: iso(ano, mes - 2, 1), fim: iso(ano, mes + 1, 0) },
    { id: 'ano-atual', rotulo: 'Este ano', inicio: iso(ano, 0, 1), fim: iso(ano, 12, 0) },
  ];
}

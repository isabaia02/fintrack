const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

const tamanhos = {
  lg: 'text-2xl font-medium',
  md: 'text-sm',
  sm: 'text-xs',
};

export function MoneyText({ valor, tamanho = 'md', comSinal = true }) {
  const numero = moeda.format(Math.abs(valor)).replace(/\u00a0/g, ' ');
  const sinal = comSinal && valor !== 0 ? (valor > 0 ? '+ ' : '− ') : '';
  const cor = comSinal && valor > 0 ? 'text-income' : 'text-text';

  return <span className={`font-mono whitespace-nowrap ${tamanhos[tamanho]} ${cor}`}>{sinal}{numero}</span>;
}

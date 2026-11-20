import { formatarMoeda } from '../../utils/formatadores';

const tamanhos = {
  lg: 'text-2xl font-medium',
  md: 'text-sm',
  sm: 'text-xs',
};

export function MoneyText({ valor, tamanho = 'md', comSinal = true }) {
  const cor = comSinal && valor > 0 ? 'text-income' : 'text-text';

  return <span className={`font-mono whitespace-nowrap ${tamanhos[tamanho]} ${cor}`}>{formatarMoeda(valor, { comSinal })}</span>;
}

import Icone from '../Icone';
import { formatarVariacao } from '../../utils/formatadores';

export function Variacao({ percentual, tamanho = 'sm' }) {
  const grande = tamanho === 'lg';
  const textoSemVariacao = <span className="text-xs text-text-muted">sem variação</span>;

  if (percentual === 0 || (percentual !== null && Math.round(percentual * 10) === 0)) return textoSemVariacao;

  const sobe = percentual === null || percentual > 0;
  const texto = percentual === null ? 'novo' : formatarVariacao(percentual);
  const descricao = percentual === null ? 'sem valor no período anterior' : `${sobe ? 'aumento' : 'queda'} de ${texto.replace(/^[+−]/, '')}`;

  return (
    <span className={`inline-flex items-center whitespace-nowrap font-mono ${grande ? 'gap-1 text-2xl font-medium tracking-[-0.01em]' : 'gap-0.5 text-xs'}`}>
      <Icone nome={sobe ? 'arrow_upward' : 'arrow_downward'} tamanho={grande ? 18 : 16} />
      <span aria-hidden="true">{texto}</span>
      <span className="sr-only">{descricao}</span>
    </span>
  );
}

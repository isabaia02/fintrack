import { Link } from 'react-router-dom';
import Icone from '../Icone';
import { formatarMoeda, formatarPercentual } from '../../utils/formatadores';
import { fundoDaCategoria } from '../../utils/cores';
import { Secao } from './Secao';

const MAXIMO_LINHAS = 6;

const somar = (itens, campo) => Math.round(itens.reduce((soma, item) => soma + item[campo], 0) * 100) / 100;

function agrupar(categorias) {
  const comValor = categorias.filter((c) => c.total > 0);
  if (comValor.length <= MAXIMO_LINHAS) return comValor;
  const restantes = comValor.slice(MAXIMO_LINHAS - 1);
  return [
    ...comValor.slice(0, MAXIMO_LINHAS - 1),
    { id: 'demais', nome: 'Demais', cor: null, total: somar(restantes, 'total'), percentual: somar(restantes, 'percentual') },
  ];
}

function Linha({ categoria, maior }) {
  const largura = `max(8px, ${(categoria.total / maior) * 100}%)`;

  return (
    <li className="flex h-9 items-center gap-3">
      <span aria-hidden="true" className={`size-2.5 shrink-0 rounded-full ${fundoDaCategoria(categoria.cor)}`} />
      <span className="w-[100px] shrink-0 truncate text-sm">{categoria.nome}</span>
      <span aria-hidden="true" className="h-2 w-[200px] shrink-0 overflow-hidden rounded-[4px] bg-surface-sunken">
        <span className={`block h-full rounded-[4px] ${fundoDaCategoria(categoria.cor)}`} style={{ width: largura }} />
      </span>
      <span className="w-[52px] shrink-0 text-right font-mono text-sm text-text-muted">
        {formatarPercentual(categoria.percentual)}
      </span>
      <span className="min-w-0 flex-1 truncate text-right font-mono text-sm">{formatarMoeda(categoria.total)}</span>
    </li>
  );
}

export function SaidasPorCategoria({ categorias }) {
  const linhas = categorias && agrupar(categorias);
  const maior = linhas && Math.max(...linhas.map((c) => c.total));

  return (
    <Secao
      titulo="Saídas por categoria"
      itens={linhas}
      vazio="Nenhuma saída neste período."
      className="gap-4"
      acao={(
        <Link to="/relatorios" className="flex items-center gap-1 rounded-sm text-sm font-medium text-primary hover:underline">
          Ver relatório
          <Icone nome="chevron_right" tamanho={18} />
        </Link>
      )}
    >
      <ul className="flex flex-col gap-1">
        {linhas?.map((c) => <Linha key={c.id} categoria={c} maior={maior} />)}
      </ul>
    </Secao>
  );
}

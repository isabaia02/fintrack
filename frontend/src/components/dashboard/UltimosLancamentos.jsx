import { Badge } from '../ui/badge';
import { MoneyText } from '../ui/money-text';
import { formatarData } from '../../utils/formatadores';
import { Secao } from './Secao';

export function UltimosLancamentos({ lancamentos }) {
  return (
    <Secao titulo="Últimos lançamentos" itens={lancamentos} vazio="Nenhum lançamento neste período.">
      <ul className="flex flex-col">
        {lancamentos?.map((l) => (
          <li key={l.id} className="flex h-12 items-center gap-3">
            <span className="w-9 shrink-0 font-mono text-xs text-text-subtle">{formatarData(l.data).slice(0, 5)}</span>
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-center gap-2">
                <span className="truncate text-sm font-medium">{l.descricao}</span>
                {l.total_parcelas > 1 && (
                  <Badge>
                    <span className="sr-only">Parcela </span>
                    {l.parcela_atual}/{l.total_parcelas}
                  </Badge>
                )}
              </div>
              <p className="truncate text-xs text-text-muted">{l.categoria?.nome} · {l.fonteDestino?.nome}</p>
            </div>
            <MoneyText valor={l.tipo === 'saida' ? -l.valor : l.valor} />
          </li>
        ))}
      </ul>
    </Secao>
  );
}

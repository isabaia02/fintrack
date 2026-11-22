import { useId, useState } from 'react';
import { formatarData, formatarMoeda } from '../../utils/formatadores';
import Icone from '../Icone';
import { Badge } from '../ui/badge';

const diaMes = (iso) => formatarData(iso).slice(0, 5);

function ItemFatura({ item }) {
  const parcelado = item.total_parcelas > 1;
  return (
    <li className="flex h-12 items-center gap-4 px-5">
      <span className="w-11 shrink-0 font-mono text-xs text-text-muted">{diaMes(item.data)}</span>
      <span className="flex min-w-0 flex-1 items-center gap-2">
        <span className="truncate text-sm font-medium">{item.descricao}</span>
        {parcelado && (
          <Badge>
            <span aria-hidden="true">{item.parcela_atual}/{item.total_parcelas}</span>
            <span className="sr-only">parcela {item.parcela_atual} de {item.total_parcelas}</span>
          </Badge>
        )}
      </span>
      <span className="font-mono text-sm whitespace-nowrap">{formatarMoeda(item.valor)}</span>
    </li>
  );
}

export function FaturaBloco({ fatura, inicialmenteAberta }) {
  const [aberta, setAberta] = useState(inicialmenteAberta);
  const idPainel = useId();

  return (
    <article className="overflow-hidden rounded-md border border-border bg-surface">
      <button
        type="button"
        aria-expanded={aberta}
        aria-controls={idPainel}
        onClick={() => setAberta((v) => !v)}
        className="flex h-[72px] w-full items-center justify-between gap-4 px-5 text-left hover:bg-surface-sunken"
      >
        <span className="flex flex-col gap-0.5">
          <span className="flex items-center gap-2">
            <h3>Fatura {fatura.referencia}</h3>
            {fatura.aberta && <Badge tom="info">Aberta</Badge>}
          </span>
          <span className="text-xs font-normal text-text-muted">
            Fecha {diaMes(fatura.fechamento)} · vence {diaMes(fatura.vencimento)}
          </span>
        </span>
        <span className="flex items-center gap-3">
          <span className="font-mono text-2xl leading-8 font-medium tracking-[-0.01em]">{formatarMoeda(fatura.total)}</span>
          <Icone nome={aberta ? 'expand_less' : 'expand_more'} />
        </span>
      </button>

      {aberta && (
        <div id={idPainel} className="border-t border-border">
          {fatura.itens.length === 0 ? (
            <p className="flex h-[72px] items-center justify-center gap-2 text-sm text-text-muted">
              <Icone nome="check_circle" />
              Nenhuma parcela prevista.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {fatura.itens.map((item) => <ItemFatura key={item.id} item={item} />)}
            </ul>
          )}
        </div>
      )}
    </article>
  );
}

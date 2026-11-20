import Icone from '../Icone';
import { Badge } from '../ui/badge';
import { MoneyText } from '../ui/money-text';
import { formatarData } from '../../utils/formatadores';
import { fundoDaCategoria } from '../../utils/cores';

const cabecalho = 'px-2 text-left text-xs font-normal text-text-muted';
const acao =
  'flex size-8 items-center justify-center rounded-sm text-text-muted hover:bg-surface hover:text-text';

function Linha({ lancamento, aoEditar, aoExcluir }) {
  const { descricao, data, categoria, fonteDestino, tipo, valor, parcela_atual: atual, total_parcelas: totalParcelas } = lancamento;

  return (
    <tr className="group h-12 border-t border-border hover:bg-surface-sunken focus-within:bg-surface-sunken">
      <td className="pr-2 pl-5 font-mono text-xs text-text-muted">{formatarData(data).slice(0, 5)}</td>
      <td className="px-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate text-sm font-medium">{descricao}</span>
          {totalParcelas > 1 && (
            <Badge>
              <span className="sr-only">Parcela </span>
              {atual}/{totalParcelas}
            </Badge>
          )}
        </div>
      </td>
      <td className="px-2">
        <div className="flex min-w-0 items-center gap-2">
          <span aria-hidden="true" className={`size-2 shrink-0 rounded-full ${fundoDaCategoria(categoria?.cor)}`} />
          <span className="truncate text-sm text-text-muted">{categoria?.nome}</span>
        </div>
      </td>
      <td className="truncate px-2 text-sm text-text-muted">{fonteDestino?.nome}</td>
      <td className="px-2 text-right">
        <MoneyText valor={tipo === 'saida' ? -valor : valor} />
      </td>
      <td className="pr-5 pl-2">
        <div className="flex items-center justify-end gap-1 opacity-0 group-focus-within:opacity-100 group-hover:opacity-100">
          <button type="button" className={acao} onClick={() => aoEditar(lancamento)} aria-label={`Editar ${descricao}`}>
            <Icone nome="edit" tamanho={18} />
          </button>
          <button type="button" className={acao} onClick={() => aoExcluir(lancamento)} aria-label={`Excluir ${descricao}`}>
            <Icone nome="delete" tamanho={18} />
          </button>
        </div>
      </td>
    </tr>
  );
}

export function TabelaLancamentos({ lancamentos, aoEditar, aoExcluir, rodape }) {
  return (
    <div className="overflow-hidden rounded-md border border-border bg-surface">
      <table className="w-full table-fixed border-collapse">
        <thead className="bg-surface-sunken">
          <tr className="h-10">
            <th scope="col" className={`w-[112px] pl-5 ${cabecalho}`}>Data</th>
            <th scope="col" className={cabecalho}>Descrição</th>
            <th scope="col" className={`w-44 ${cabecalho}`}>Categoria</th>
            <th scope="col" className={`w-44 ${cabecalho}`}>Fonte/destino</th>
            <th scope="col" className={`w-[166px] ${cabecalho} text-right`}>Valor</th>
            <th scope="col" className="w-[100px]"><span className="sr-only">Ações</span></th>
          </tr>
        </thead>
        <tbody>
          {lancamentos.map((l) => (
            <Linha key={l.id} lancamento={l} aoEditar={aoEditar} aoExcluir={aoExcluir} />
          ))}
        </tbody>
      </table>
      <div className="border-t border-border">{rodape}</div>
    </div>
  );
}

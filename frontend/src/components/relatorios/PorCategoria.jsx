import { formatarMoeda, formatarPercentual } from '../../utils/formatadores';
import { fundoDaCategoria } from '../../utils/cores';
import { Carregando } from '../ui/carregando';
import { ListaVazia } from '../ui/lista-vazia';
import { MensagemErro } from '../ui/mensagem-erro';
import { BarrasComparativas } from './BarrasComparativas';
import { useRelatorio } from './useRelatorio';
import { Variacao } from './Variacao';

const celula = 'font-mono text-sm';

function Tabela({ saidas, comparar }) {
  return (
    <div className="min-w-0 flex-1 overflow-x-auto rounded-md border border-border bg-surface">
      <table className="w-full min-w-[520px] border-collapse">
        <caption className="sr-only">Saídas por categoria no período, com participação no total{comparar ? ' e variação em relação ao período anterior' : ''}</caption>
        <thead>
          <tr className="h-10 bg-surface-sunken text-xs font-normal text-text-muted">
            <th scope="col" className="px-5 text-left font-normal">Categoria</th>
            <th scope="col" className="w-[110px] text-right font-normal">Total</th>
            <th scope="col" className="w-20 text-right font-normal">% do total</th>
            {comparar && <th scope="col" className="w-[100px] pr-5 text-right font-normal">vs. anterior</th>}
            {!comparar && <th scope="col" className="w-5" aria-hidden="true" />}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {saidas.categorias.map((c) => (
            <tr key={c.id} className="h-[52px]">
              <th scope="row" className="px-5 text-left text-sm font-medium">
                <span className="flex items-center gap-2.5">
                  <span aria-hidden="true" className={`size-2.5 shrink-0 rounded-full ${fundoDaCategoria(c.cor)}`} />
                  {c.nome}
                </span>
              </th>
              <td className={`text-right ${celula}`}>{formatarMoeda(c.total)}</td>
              <td className={`text-right text-text-muted ${celula}`}>{formatarPercentual(c.percentual, 2)}</td>
              {comparar && <td className="pr-5 text-right"><Variacao percentual={c.variacaoPercentual} /></td>}
              {!comparar && <td />}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="h-[52px] border-t border-border bg-surface-sunken">
            <th scope="row" className="px-5 text-left text-sm font-medium">Total de saídas</th>
            <td className={`text-right ${celula}`}>{formatarMoeda(saidas.total)}</td>
            <td className={`text-right text-text-muted ${celula}`}>{formatarPercentual(saidas.total ? 100 : 0, 0)}</td>
            {comparar && <td className="pr-5 text-right"><Variacao percentual={saidas.variacaoPercentual} /></td>}
            {!comparar && <td />}
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

export function PorCategoria({ periodo, comparar }) {
  const { dados, carregando, erro, recarregar } = useRelatorio('categorias', periodo);

  if (carregando) return <Carregando linhas={5} />;
  if (erro) return <MensagemErro mensagem={erro} onTentarDeNovo={recarregar} />;

  const { saidas } = dados;
  if (saidas.categorias.length === 0) {
    return <ListaVazia titulo="Nenhuma saída neste período" frase="Escolha outro período ou registre lançamentos de saída." />;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end gap-x-8 gap-y-2">
        <div className="flex flex-col gap-0.5">
          <p className="text-sm text-text-muted">Total de saídas</p>
          <p className="text-[48px] leading-[52px] font-medium tracking-[-0.02em]">{formatarMoeda(saidas.total)}</p>
        </div>
        {comparar && (
          <div className="flex flex-col gap-0.5">
            <p className="text-xs text-text-muted">vs. período anterior ({formatarMoeda(saidas.totalAnterior)})</p>
            <Variacao percentual={saidas.variacaoPercentual} tamanho="lg" />
          </div>
        )}
      </div>

      <div className="flex flex-col items-start gap-6 lg:flex-row">
        <Tabela saidas={saidas} comparar={comparar} />
        <BarrasComparativas categorias={saidas.categorias} comparar={comparar} />
      </div>
    </div>
  );
}

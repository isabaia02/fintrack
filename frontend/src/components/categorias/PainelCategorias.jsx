import { MenuAcoes } from '../ui/menu-acoes';
import { fundoDaCategoria } from '../../utils/cores';

const plural = (n, singular, pluralTxt) => `${n} ${n === 1 ? singular : pluralTxt}`;

function Linha({ categoria, aoEditar, aoExcluir }) {
  return (
    <li className="flex h-[52px] items-center gap-3 px-4 hover:bg-surface-sunken has-[[aria-expanded=true]]:bg-surface-sunken">
      <span aria-hidden="true" className={`size-3 shrink-0 rounded-full ${fundoDaCategoria(categoria.cor)}`} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{categoria.nome}</p>
        <p className="text-xs text-text-muted">{plural(categoria.total_lancamentos, 'lançamento', 'lançamentos')}</p>
      </div>
      <MenuAcoes
        rotulo={`Ações da categoria ${categoria.nome}`}
        itens={[
          { rotulo: 'Editar', icone: 'edit', aoClicar: () => aoEditar(categoria) },
          { rotulo: 'Excluir', icone: 'delete', perigo: true, aoClicar: () => aoExcluir(categoria) },
        ]}
      />
    </li>
  );
}

export function PainelCategorias({ titulo, categorias, mensagemVazia, aoEditar, aoExcluir }) {
  return (
    <section aria-label={titulo} className="min-w-0 flex-1 rounded-md border border-border bg-surface">
      <header className="flex h-14 items-center justify-between px-4">
        <h3>{titulo}</h3>
        <span className="text-xs text-text-muted">{plural(categorias.length, 'categoria', 'categorias')}</span>
      </header>
      <hr className="h-px border-0 bg-border" />
      {categorias.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-text-muted">{mensagemVazia}</p>
      ) : (
        <ul className="divide-y divide-border">
          {categorias.map((c) => (
            <Linha key={c.id} categoria={c} aoEditar={aoEditar} aoExcluir={aoExcluir} />
          ))}
        </ul>
      )}
    </section>
  );
}

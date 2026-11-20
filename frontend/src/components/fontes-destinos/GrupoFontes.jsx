import Icone from '../Icone';
import { MenuAcoes } from '../ui/menu-acoes';
import { descricaoDoItem, iconeDoItem } from './rotulos';

function Linha({ item, aoEditar, aoExcluir }) {
  return (
    <li className="flex h-[72px] items-center gap-4 px-5">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-sm bg-accent-soft text-primary">
        <Icone nome={iconeDoItem(item)} tamanho={22} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{item.nome}</p>
        <p className="truncate text-xs text-text-muted">{descricaoDoItem(item)}</p>
      </div>
      <MenuAcoes
        rotulo={`Ações de ${item.nome}`}
        itens={[
          { rotulo: 'Editar', icone: 'edit', aoClicar: () => aoEditar(item) },
          { rotulo: 'Excluir', icone: 'delete', perigo: true, aoClicar: () => aoExcluir(item) },
        ]}
      />
    </li>
  );
}

export function GrupoFontes({ grupo, itens, aoEditar, aoExcluir }) {
  return (
    <section aria-label={grupo.titulo} className="flex flex-col gap-3">
      <h3>{grupo.titulo}</h3>
      <div className="rounded-md border border-border bg-surface">
        {itens.length === 0 ? (
          <p className="px-5 py-6 text-sm text-text-muted">{grupo.vazio}</p>
        ) : (
          <ul className="divide-y divide-border">
            {itens.map((item) => (
              <Linha key={item.id} item={item} aoEditar={aoEditar} aoExcluir={aoExcluir} />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

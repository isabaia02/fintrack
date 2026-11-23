import Icone from '../Icone';
import { BarraLimite } from '../ui/barra-limite';
import { MenuAcoes } from '../ui/menu-acoes';
import { MoneyText } from '../ui/money-text';
import { formatarMoeda } from '../../utils/formatadores';
import { descricaoDoItem, iconeDoItem } from './rotulos';

function ValorDoItem({ item, valores }) {
  if (valores === undefined) return null;
  if (valores === null) {
    return (
      <p className="text-sm text-text-subtle">
        <span aria-hidden="true">—</span>
        <span className="sr-only">Indisponível no momento.</span>
      </p>
    );
  }

  const valor = valores.get(item.id) ?? 0;
  if (item.tipo === 'renda') return <MoneyText valor={valor} />;
  if (item.tipo === 'conta') return <MoneyText valor={valor} comSinal={false} />;
  return (
    <div className="flex flex-col items-end gap-1.5">
      <p className="text-xs whitespace-nowrap text-text-muted">
        Usado {formatarMoeda(valor)} de {formatarMoeda(item.limite)}
      </p>
      <BarraLimite nome={item.nome} utilizado={valor} limite={item.limite} className="w-[200px]" />
    </div>
  );
}

function Linha({ item, valores, aoEditar, aoExcluir }) {
  return (
    <li className="flex h-[72px] items-center gap-4 px-5">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-sm bg-accent-soft text-primary">
        <Icone nome={iconeDoItem(item)} tamanho={22} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{item.nome}</p>
        <p className="truncate text-xs text-text-muted">{descricaoDoItem(item)}</p>
      </div>
      <ValorDoItem item={item} valores={valores} />
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

export function GrupoFontes({ grupo, itens, valores, aoEditar, aoExcluir }) {
  return (
    <section aria-label={grupo.titulo} className="flex flex-col gap-3">
      <h3>{grupo.titulo}</h3>
      <div className="rounded-md border border-border bg-surface">
        {itens.length === 0 ? (
          <p className="px-5 py-6 text-sm text-text-muted">{grupo.vazio}</p>
        ) : (
          <ul className="divide-y divide-border">
            {itens.map((item) => (
              <Linha key={item.id} item={item} valores={valores} aoEditar={aoEditar} aoExcluir={aoExcluir} />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

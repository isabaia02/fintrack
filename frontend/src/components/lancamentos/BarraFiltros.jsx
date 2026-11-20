import { rotuloMes } from '../../utils/formatadores';
import { FiltroSelect } from '../ui/filtro-select';
import { Segmentado } from '../ui/segmentado';

const TIPOS = [
  { valor: 'todos', rotulo: 'Todos' },
  { valor: 'entrada', rotulo: 'Entradas' },
  { valor: 'saida', rotulo: 'Saídas' },
];

const MESES_AO_REDOR = 12;

function opcoesDePeriodo(ano, mes) {
  return Array.from({ length: MESES_AO_REDOR * 2 + 1 }, (_, i) => {
    const d = new Date(Date.UTC(ano, mes + MESES_AO_REDOR - i, 1));
    const a = d.getUTCFullYear();
    const m = d.getUTCMonth();
    return { valor: `${a}-${m}`, rotulo: rotuloMes(a, m) };
  });
}

const comTodas = (itens) => [
  { valor: '', rotulo: 'Todas' },
  ...itens.map((i) => ({ valor: String(i.id), rotulo: i.nome })),
];

export function BarraFiltros({ periodo, filtros, categorias, fontes, aoMudarPeriodo, aoMudar, aoLimpar }) {
  const categoriasDoTipo = filtros.tipo === 'todos' ? categorias : categorias.filter((c) => c.tipo === filtros.tipo);

  return (
    <div role="search" aria-label="Filtros de lançamentos" className="flex flex-wrap items-center gap-3">
      <FiltroSelect
        rotulo="Período"
        valor={`${periodo.ano}-${periodo.mes}`}
        opcoes={opcoesDePeriodo(periodo.ano, periodo.mes)}
        onChange={(v) => {
          const [a, m] = v.split('-').map(Number);
          aoMudarPeriodo(a, m);
        }}
      />
      <Segmentado rotulo="Tipo" opcoes={TIPOS} valor={filtros.tipo} onChange={(tipo) => aoMudar({ tipo })} />
      <FiltroSelect
        rotulo="Categoria"
        valor={filtros.categoriaId}
        opcoes={comTodas(categoriasDoTipo)}
        onChange={(categoriaId) => aoMudar({ categoriaId })}
      />
      <FiltroSelect
        rotulo="Fonte/destino"
        valor={filtros.fonteDestinoId}
        opcoes={comTodas(fontes)}
        onChange={(fonteDestinoId) => aoMudar({ fonteDestinoId })}
      />
      <button
        type="button"
        onClick={aoLimpar}
        className="h-10 rounded-sm px-2 text-sm font-medium text-primary hover:underline"
      >
        Limpar filtros
      </button>
    </div>
  );
}

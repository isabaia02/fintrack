import { useEffect, useRef, useState } from 'react';
import { formatarMoeda, formatarVariacao } from '../../utils/formatadores';
import { fundoDaCategoria } from '../../utils/cores';

const MIN_VISIVEL = 1.5;
const LARGURA_DICA = 240;
const ALTURA_DICA = 88;
const MARGEM = 8;

const largura = (valor, maximo) => (valor > 0 && maximo > 0 ? Math.max((valor / maximo) * 100, MIN_VISIVEL) : 0);

function Barra({ valor, maximo, fundo }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-3 min-w-0 flex-1 overflow-hidden rounded-md bg-surface-sunken">
        <div className={`h-full rounded-md ${fundo}`} style={{ width: `${largura(valor, maximo)}%` }} />
      </div>
      <span className="w-24 shrink-0 font-mono text-xs">{formatarMoeda(valor)}</span>
    </div>
  );
}

export function BarrasComparativas({ categorias, comparar }) {
  const [dica, setDica] = useState(null);
  const grafico = useRef(null);
  const maximo = Math.max(0, ...categorias.map((c) => Math.max(c.total, comparar ? c.totalAnterior : 0)));

  const posicionar = (categoria, e) => setDica({ categoria, x: e.clientX, y: e.clientY });

  const aoEntrar = (categoria) => (e) => { if (e.pointerType === 'mouse') posicionar(categoria, e); };
  const aoTocar = (categoria) => (e) => {
    if (e.pointerType === 'mouse') return;
    setDica((atual) => (atual?.categoria.id === categoria.id ? null : { categoria, x: e.clientX, y: e.clientY }));
  };

  useEffect(() => {
    if (!dica) return undefined;
    const fora = (e) => { if (!grafico.current?.contains(e.target)) setDica(null); };
    const esc = (e) => { if (e.key === 'Escape') setDica(null); };
    document.addEventListener('pointerdown', fora);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('pointerdown', fora);
      document.removeEventListener('keydown', esc);
    };
  }, [dica]);

  const posicaoDica = dica && {
    left: Math.max(MARGEM, Math.min(dica.x + 12, window.innerWidth - LARGURA_DICA - MARGEM)),
    top: Math.max(MARGEM, Math.min(dica.y + 12, window.innerHeight - ALTURA_DICA - MARGEM)),
  };

  return (
    <div className="flex min-w-0 flex-col gap-5 rounded-md border border-border bg-surface p-6 lg:w-[456px] lg:shrink-0">
      <h3>Saídas por categoria</h3>

      <ul className="flex flex-wrap items-center gap-4 text-xs text-text-muted" aria-label="Legenda">
        <li className="flex items-center gap-1.5">
          <span aria-hidden="true" className="size-2.5 rounded-full bg-chart-1" />
          Período atual (cor da categoria)
        </li>
        {comparar && (
          <li className="flex items-center gap-1.5">
            <span aria-hidden="true" className="size-2.5 rounded-full bg-chart-other" />
            Período anterior
          </li>
        )}
      </ul>

      <div
        ref={grafico}
        role="img"
        aria-label="Gráfico de barras das saídas por categoria. Os mesmos valores estão na tabela."
        onPointerLeave={(e) => { if (e.pointerType === 'mouse') setDica(null); }}
        className="flex flex-col gap-5"
      >
        {categorias.map((categoria) => (
          <div
            key={categoria.id}
            onPointerEnter={aoEntrar(categoria)}
            onPointerMove={aoEntrar(categoria)}
            onPointerDown={aoTocar(categoria)}
            className="flex flex-col gap-1.5"
          >
            <p className="text-sm font-medium">{categoria.nome}</p>
            <Barra valor={categoria.total} maximo={maximo} fundo={fundoDaCategoria(categoria.cor)} />
            {comparar && <Barra valor={categoria.totalAnterior} maximo={maximo} fundo="bg-chart-other" />}
          </div>
        ))}
      </div>

      {dica && (
        <div
          role="tooltip"
          style={posicaoDica}
          className="pointer-events-none fixed z-20 flex max-w-60 flex-col gap-0.5 rounded-sm border border-border bg-surface px-3 py-2 text-xs shadow-popover"
        >
          <span className="text-text-muted">{dica.categoria.nome}</span>
          <span className="font-mono">{formatarMoeda(dica.categoria.total)}</span>
          {comparar && (
            <span>
              {dica.categoria.variacaoPercentual === null ? 'novo' : formatarVariacao(dica.categoria.variacaoPercentual)} vs. {formatarMoeda(dica.categoria.totalAnterior)}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

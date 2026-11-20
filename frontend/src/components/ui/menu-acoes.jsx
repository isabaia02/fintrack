import { useEffect, useRef, useState } from 'react';
import Icone from '../Icone';

export function MenuAcoes({ rotulo, itens, aoAbrir }) {
  const [aberto, setAberto] = useState(false);
  const raiz = useRef(null);

  useEffect(() => {
    if (!aberto) return undefined;
    const fecharFora = (e) => { if (!raiz.current?.contains(e.target)) setAberto(false); };
    const fecharEsc = (e) => { if (e.key === 'Escape') setAberto(false); };
    document.addEventListener('mousedown', fecharFora);
    document.addEventListener('keydown', fecharEsc);
    return () => {
      document.removeEventListener('mousedown', fecharFora);
      document.removeEventListener('keydown', fecharEsc);
    };
  }, [aberto]);

  return (
    <div ref={raiz} className="relative">
      <button
        type="button"
        aria-label={rotulo}
        aria-haspopup="menu"
        aria-expanded={aberto}
        onClick={() => { setAberto((v) => !v); aoAbrir?.(); }}
        className="flex size-8 items-center justify-center rounded-sm text-text-muted hover:bg-surface-sunken hover:text-text aria-expanded:bg-surface-sunken"
      >
        <Icone nome="more_horiz" />
      </button>
      {aberto && (
        <div
          role="menu"
          className="absolute top-full right-0 z-10 mt-1 flex w-44 flex-col gap-0.5 rounded-md border border-border bg-surface p-1 shadow-popover"
        >
          {itens.map((item) => (
            <button
              key={item.rotulo}
              type="button"
              role="menuitem"
              onClick={() => { setAberto(false); item.aoClicar(); }}
              className={`flex h-9 items-center gap-3 rounded-sm px-3 text-sm hover:bg-surface-sunken ${item.perigo ? 'text-danger' : 'text-text'}`}
            >
              <Icone nome={item.icone} tamanho={18} />
              {item.rotulo}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

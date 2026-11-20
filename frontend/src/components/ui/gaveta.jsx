import { useEffect, useId, useRef } from 'react';
import Icone from '../Icone';

export function Gaveta({ aberto, aoFechar, titulo, aoEnviar, rodape, children }) {
  const ref = useRef(null);
  const tituloId = useId();

  useEffect(() => {
    const gaveta = ref.current;
    if (aberto && !gaveta.open) gaveta.showModal();
    if (!aberto && gaveta.open) gaveta.close();
  }, [aberto]);

  const Raiz = aoEnviar ? 'form' : 'div';

  return (
    <dialog
      ref={ref}
      aria-labelledby={tituloId}
      onClose={aoFechar}
      onClick={(e) => { if (e.target === ref.current) aoFechar(); }}
      className="fixed inset-y-0 right-0 left-auto m-0 h-dvh max-h-none w-[480px] max-w-full border-l border-border bg-surface p-0 text-text backdrop:bg-text/40 open:flex"
    >
      {aberto && (
        <Raiz onSubmit={aoEnviar} noValidate className="flex min-h-0 flex-1 flex-col">
          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-6">
            <div className="flex items-center justify-between">
              <h2 id={tituloId}>{titulo}</h2>
              <button
                type="button"
                aria-label="Fechar"
                onClick={aoFechar}
                className="flex size-8 items-center justify-center rounded-sm text-text-muted hover:bg-surface-sunken hover:text-text"
              >
                <Icone nome="close" />
              </button>
            </div>
            {children}
          </div>
          {rodape && (
            <div className="flex items-center justify-end gap-3 border-t border-border px-6 py-4">{rodape}</div>
          )}
        </Raiz>
      )}
    </dialog>
  );
}

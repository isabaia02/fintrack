import { useId } from 'react';
import { useDialogoNativo } from '../../hooks/useDialogoNativo';
import Icone from '../Icone';

export function Gaveta({ aberto, aoFechar, bloqueada = false, titulo, aoEnviar, aoTeclar, rodape, children }) {
  const tituloId = useId();
  const eventos = useDialogoNativo({ aberto, aoFechar, bloqueada });

  const Raiz = aoEnviar ? 'form' : 'div';

  return (
    <dialog
      {...eventos}
      aria-labelledby={tituloId}
      className="fixed inset-y-0 right-0 left-auto m-0 h-dvh max-h-none w-[480px] max-w-full border-l border-border bg-surface p-0 text-text backdrop:bg-text/40 open:flex"
    >
      {aberto && (
        <Raiz onSubmit={aoEnviar} onKeyDown={aoTeclar} noValidate className="flex min-h-0 flex-1 flex-col">
          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-6">
            <div className="flex items-center justify-between">
              <h2 id={tituloId}>{titulo}</h2>
              <button
                type="button"
                aria-label="Fechar"
                onClick={aoFechar}
                disabled={bloqueada}
                className="flex size-8 items-center justify-center rounded-sm text-text-muted enabled:hover:bg-surface-sunken enabled:hover:text-text disabled:cursor-not-allowed disabled:opacity-60"
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

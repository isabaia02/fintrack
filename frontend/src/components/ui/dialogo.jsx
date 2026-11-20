import { useEffect, useRef } from 'react';
import Icone from '../Icone';

export function Dialogo({ aberto, aoFechar, titulo, icone, corIcone = 'text-warning', children, acoes, largura = 'w-[440px]' }) {
  const ref = useRef(null);

  useEffect(() => {
    const dialogo = ref.current;
    if (aberto && !dialogo.open) dialogo.showModal();
    if (!aberto && dialogo.open) dialogo.close();
  }, [aberto]);

  return (
    <dialog
      ref={ref}
      aria-labelledby="dialogo-titulo"
      onClose={aoFechar}
      onClick={(e) => { if (e.target === ref.current) aoFechar(); }}
      className={`m-auto max-w-[calc(100vw-32px)] rounded-lg border border-border bg-surface p-0 text-text backdrop:bg-text/40 ${largura}`}
    >
      {aberto && (
        <div className="flex flex-col gap-6 p-8">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              {icone && <span className={corIcone}><Icone nome={icone} tamanho={24} /></span>}
              <h2 id="dialogo-titulo">{titulo}</h2>
            </div>
            {children}
          </div>
          {acoes && <div className="flex items-start justify-end gap-3">{acoes}</div>}
        </div>
      )}
    </dialog>
  );
}

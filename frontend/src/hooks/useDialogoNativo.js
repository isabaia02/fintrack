import { useEffect, useRef } from 'react';

// Liga um <dialog> nativo ao estado `aberto` do React. Com `bloqueada`, o diálogo não pode
// ser fechado pelo usuário (Esc, clique no backdrop): o `onCancel` é cancelado antes de o
// navegador fechar o <dialog>, então o estado do React e o do DOM não se desencontram.
export function useDialogoNativo({ aberto, aoFechar, bloqueada = false }) {
  const ref = useRef(null);

  useEffect(() => {
    const dialogo = ref.current;
    if (aberto && !dialogo.open) dialogo.showModal();
    if (!aberto && dialogo.open) dialogo.close();
  }, [aberto]);

  return {
    ref,
    onCancel: (e) => { if (bloqueada) e.preventDefault(); },
    onClose: () => {
      // Alguns navegadores fecham no segundo Esc mesmo com o cancel impedido: reabre.
      if (aberto && bloqueada) { ref.current.showModal(); return; }
      aoFechar();
    },
    onClick: (e) => { if (!bloqueada && e.target === ref.current) aoFechar(); },
  };
}

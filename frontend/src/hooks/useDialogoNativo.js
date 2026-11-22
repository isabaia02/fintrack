import { useEffect, useRef } from 'react';

export function useDialogoNativo({ aberto, aoFechar, bloqueada = false }) {
  const ref = useRef(null);

  useEffect(() => {
    const dialogo = ref.current;
    if (aberto && !dialogo.open) {
      dialogo.showModal();
      dialogo.querySelector('[data-autofocus]')?.focus();
    }
    if (!aberto && dialogo.open) dialogo.close();
  }, [aberto]);

  return {
    ref,
    onCancel: (e) => {
      if (!e.cancelable) return;
      e.preventDefault();
      if (!bloqueada) aoFechar();
    },
    onClose: () => {
      if (!aberto) return;
      ref.current.showModal();
      if (!bloqueada) aoFechar();
    },
    onClick: (e) => { if (!bloqueada && e.target === ref.current) aoFechar(); },
  };
}

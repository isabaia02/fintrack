import { createContext, useContext } from 'react';

export const PeriodoContext = createContext(null);

export function usePeriodo() {
  const ctx = useContext(PeriodoContext);
  if (!ctx) throw new Error('usePeriodo deve ser usado dentro de PeriodoProvider');
  return ctx;
}

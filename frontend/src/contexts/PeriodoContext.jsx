import { createContext, useContext, useMemo, useState } from 'react';
import { rotuloMes } from '../utils/formatadores';

const PeriodoContext = createContext(null);

const iso = (ano, mes, dia) => new Date(Date.UTC(ano, mes, dia)).toISOString().slice(0, 10);

export function PeriodoProvider({ children }) {
  const hoje = new Date();
  const [{ ano, mes }, setMes] = useState({ ano: hoje.getFullYear(), mes: hoje.getMonth() });

  const valor = useMemo(() => {
    const deslocar = (delta) => setMes(({ ano: a, mes: m }) => {
      const d = new Date(Date.UTC(a, m + delta, 1));
      return { ano: d.getUTCFullYear(), mes: d.getUTCMonth() };
    });
    return {
      ano,
      mes,
      rotulo: rotuloMes(ano, mes),
      inicio: iso(ano, mes, 1),
      fim: iso(ano, mes + 1, 0), 
      anterior: () => deslocar(-1),
      proximo: () => deslocar(1),
    };
  }, [ano, mes]);

  return <PeriodoContext.Provider value={valor}>{children}</PeriodoContext.Provider>;
}

export function usePeriodo() {
  const ctx = useContext(PeriodoContext);
  if (!ctx) throw new Error('usePeriodo deve ser usado dentro de PeriodoProvider');
  return ctx;
}

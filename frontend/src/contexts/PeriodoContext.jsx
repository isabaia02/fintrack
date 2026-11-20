import { useMemo, useState } from 'react';
import { rotuloMes } from '../utils/formatadores';
import { PeriodoContext } from './periodo';

const iso = (ano, mes, dia) => new Date(Date.UTC(ano, mes, dia)).toISOString().slice(0, 10);

export function PeriodoProvider({ children }) {
  const [atual] = useState(() => {
    const hoje = new Date();
    return { ano: hoje.getFullYear(), mes: hoje.getMonth() };
  });
  const [{ ano, mes }, setMes] = useState(atual);

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
      noMesAtual: ano === atual.ano && mes === atual.mes,
      definir: (novoAno, novoMes) => setMes({ ano: novoAno, mes: novoMes }),
      voltarAoAtual: () => setMes(atual),
    };
  }, [ano, mes, atual]);

  return <PeriodoContext.Provider value={valor}>{children}</PeriodoContext.Provider>;
}

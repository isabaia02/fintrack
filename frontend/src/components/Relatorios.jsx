import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { periodosPredefinidos } from '../utils/periodos';
import { PorCategoria } from './relatorios/PorCategoria';
import { PorFonteDestino } from './relatorios/PorFonteDestino';
import { Abas, PainelAba } from './ui/abas';
import { Chave } from './ui/chave';
import { SeletorIntervalo } from './ui/seletor-intervalo';

const ID_BASE = 'relatorios';
const ABAS = [
  { valor: 'categoria', rotulo: 'Por categoria' },
  { valor: 'fonte-destino', rotulo: 'Por fonte e destino' },
];

export default function Relatorios() {
  const [searchParams, setSearchParams] = useSearchParams();
  const aba = searchParams.get('aba') === 'fonte-destino' ? 'fonte-destino' : 'categoria';
  const [periodo, setPeriodo] = useState(() => {
    const { id, inicio, fim } = periodosPredefinidos()[0];
    return { id, inicio, fim };
  });
  const [comparar, setComparar] = useState(true);

  const trocarAba = (valor) => setSearchParams(valor === 'categoria' ? {} : { aba: valor }, { replace: true });

  return (
    <div className="flex flex-col gap-6">
      <Abas abas={ABAS} ativa={aba} onChange={trocarAba} rotulo="Tipo de relatório" idBase={ID_BASE} />

      <div className="flex flex-wrap items-center gap-4">
        <SeletorIntervalo valor={periodo} onChange={setPeriodo} />
        {aba === 'categoria' && (
          <Chave rotulo="Comparar com período anterior" ligada={comparar} onChange={setComparar} />
        )}
      </div>

      <PainelAba idBase={ID_BASE} valor={aba}>
        {aba === 'categoria'
          ? <PorCategoria periodo={periodo} comparar={comparar} />
          : <PorFonteDestino periodo={periodo} />}
      </PainelAba>
    </div>
  );
}

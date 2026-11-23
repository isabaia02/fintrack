import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { usePeriodo } from '../contexts/periodo';
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

const dataIso = (texto) => (
  /^\d{4}-\d{2}-\d{2}$/.test(texto ?? '') && !Number.isNaN(Date.parse(texto)) ? texto : null
);

export default function Relatorios() {
  const [searchParams, setSearchParams] = useSearchParams();
  const global = usePeriodo();
  const aba = searchParams.get('aba') === 'fonte-destino' ? 'fonte-destino' : 'categoria';
  const [comparar, setComparar] = useState(true);

  const paramInicio = dataIso(searchParams.get('inicio'));
  const paramFim = dataIso(searchParams.get('fim'));
  const urlValida = paramInicio && paramFim && paramInicio <= paramFim;
  const inicio = urlValida ? paramInicio : global.inicio;
  const fim = urlValida ? paramFim : global.fim;

  const periodo = useMemo(() => {
    const predefinido = periodosPredefinidos().find((p) => p.inicio === inicio && p.fim === fim);
    return { id: predefinido?.id ?? 'personalizado', inicio, fim };
  }, [inicio, fim]);

  const atualizarUrl = (mudar) => setSearchParams((atual) => {
    const proximos = new URLSearchParams(atual);
    mudar(proximos);
    return proximos;
  }, { replace: true });

  const trocarAba = (valor) => atualizarUrl((p) => {
    if (valor === 'categoria') p.delete('aba');
    else p.set('aba', valor);
  });

  const trocarPeriodo = ({ inicio: novoInicio, fim: novoFim }) => atualizarUrl((p) => {
    p.set('inicio', novoInicio);
    p.set('fim', novoFim);
  });

  return (
    <div className="flex flex-col gap-6">
      <Abas abas={ABAS} ativa={aba} onChange={trocarAba} rotulo="Tipo de relatório" idBase={ID_BASE} />

      <div className="flex flex-wrap items-center gap-4">
        <SeletorIntervalo valor={periodo} onChange={trocarPeriodo} />
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

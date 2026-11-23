import { Badge } from '../ui/badge';
import { formatarValorIndicador, rotuloMesAno, seloDoIndicador } from '../../utils/saudeFinanceira';

function Indicador({ indicador }) {
  const selo = seloDoIndicador(indicador);
  const valor = formatarValorIndicador(indicador);

  return (
    <li className="flex min-h-22 items-center gap-4 px-5 py-3">
      <p className="w-28 shrink-0 font-mono text-2xl leading-8 font-medium tracking-[-0.01em] sm:w-36">
        {indicador.valor === null ? (
          <>
            <span aria-hidden="true">{valor}</span>
            <span className="sr-only">Sem dados</span>
          </>
        ) : valor}
      </p>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <h3 className="text-sm leading-5 font-medium">{indicador.titulo}</h3>
        <p className="text-xs leading-4 text-text-muted">{indicador.mensagem}</p>
      </div>
      <Badge tom={selo.tom}>
        <span className="sr-only">Situação: </span>
        {selo.rotulo}
      </Badge>
    </li>
  );
}

export function ListaIndicadores({ indicadores, referencia }) {
  return (
    <section aria-labelledby="titulo-indicadores" className="min-w-0 flex-1 overflow-hidden rounded-md border border-border bg-surface">
      <div className="flex h-14 items-center justify-between gap-4 border-b border-border px-5">
        <h2 id="titulo-indicadores" className="text-base">Indicadores do mês</h2>
        <span className="text-xs text-text-muted">{rotuloMesAno(referencia)}</span>
      </div>
      <ul className="divide-y divide-border">
        {indicadores.map((indicador) => <Indicador key={indicador.id} indicador={indicador} />)}
      </ul>
    </section>
  );
}

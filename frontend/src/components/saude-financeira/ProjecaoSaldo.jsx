import { useId } from 'react';
import { formatarMoeda } from '../../utils/formatadores';
import { mesPorExtenso, rotuloMesAno, rotuloMesCurto } from '../../utils/saudeFinanceira';
import { Aviso } from '../ui/aviso';

const LARGURA = 392;
const ALTURA = 192;
const X_MIN = 24;
const X_MAX = 368;
const Y_TOPO = 20;
const Y_BASE = 160;
const Y_ROTULO_MES = 180;

function escalas(serie) {
  const saldos = serie.map((p) => p.saldo);
  const minimo = Math.min(0, ...saldos);
  const maximo = Math.max(0, ...saldos);
  const amplitude = maximo - minimo || 1;
  const y = (saldo) => Y_TOPO + ((maximo - saldo) / amplitude) * (Y_BASE - Y_TOPO);
  const passo = serie.length > 1 ? (X_MAX - X_MIN) / (serie.length - 1) : 0;
  const x = (i) => (serie.length > 1 ? X_MIN + i * passo : (X_MIN + X_MAX) / 2);
  return { x, y };
}

function posicaoDoRotulo(ponto, vizinho) {
  const abaixo = vizinho && vizinho.cy < ponto.cy && ponto.cy + 16 < Y_BASE + 6;
  return abaixo ? ponto.cy + 18 : Math.max(ponto.cy - 10, 12);
}

function Grafico({ serie }) {
  const { x, y } = escalas(serie);
  const pontos = serie.map((p, i) => ({ ...p, cx: x(i), cy: y(p.saldo) }));
  const linha = pontos.map((p) => `${p.cx},${p.cy}`).join(' ');
  const inicial = pontos[0];
  const final = pontos.at(-1);
  const yZero = y(0);

  return (
    <svg viewBox={`0 0 ${LARGURA} ${ALTURA}`} className="h-auto w-full" aria-hidden="true">
      {[Y_TOPO, (Y_TOPO + Y_BASE) / 2].map((gy) => (
        <line key={gy} x1="0" x2={LARGURA} y1={gy} y2={gy} className="stroke-border" strokeWidth="1" />
      ))}
      <line x1="0" x2={LARGURA} y1={yZero} y2={yZero} className="stroke-border-strong" strokeWidth="1" />
      <polyline points={linha} fill="none" className="stroke-chart-1" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {pontos.map((p) => (
        <circle
          key={p.mes}
          cx={p.cx}
          cy={p.cy}
          r="4"
          strokeWidth="2"
          className={p.saldo < 0 ? 'fill-surface stroke-danger' : 'fill-surface stroke-chart-1'}
        />
      ))}
      {pontos.map((p) => (
        <text key={p.mes} x={p.cx} y={Y_ROTULO_MES} textAnchor="middle" className="fill-text-muted text-xs">
          {rotuloMesCurto(p.mes)}
        </text>
      ))}
      <text x={inicial.cx + 8} y={posicaoDoRotulo(inicial, pontos[1])} className="fill-text font-mono text-xs">
        {formatarMoeda(inicial.saldo)}
      </text>
      <text x={final.cx - 8} y={posicaoDoRotulo(final, pontos.at(-2))} textAnchor="end" className="fill-text font-mono text-xs">
        {formatarMoeda(final.saldo)}
      </text>
    </svg>
  );
}

function TabelaEquivalente({ serie }) {
  return (
    <details className="group text-sm">
      <summary className="w-fit cursor-pointer rounded-sm text-primary underline-offset-2 hover:underline">
        Ver como tabela
      </summary>
      <table className="mt-3 w-full text-left text-xs">
        <caption className="sr-only">Saldo projetado ao fim de cada mês</caption>
        <thead className="text-text-muted">
          <tr>
            <th scope="col" className="py-1 font-normal">Mês</th>
            <th scope="col" className="py-1 text-right font-normal">Saldo projetado</th>
            <th scope="col" className="py-1 pl-3 font-normal">Situação</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border border-t border-border">
          {serie.map((p) => (
            <tr key={p.mes}>
              <th scope="row" className="py-2 font-normal">{rotuloMesAno(p.mes)}</th>
              <td className={`py-2 text-right font-mono ${p.saldo < 0 ? 'text-danger' : ''}`}>{formatarMoeda(p.saldo)}</td>
              <td className="py-2 pl-3">{p.saldo < 0 ? 'Negativo' : 'Positivo'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}

export function ProjecaoSaldo({ projecao }) {
  const idDescricao = useId();
  const { serie, fica_negativo: negativo, primeiro_mes_negativo: primeiroNegativo } = projecao;
  const inicial = serie[0];
  const final = serie.at(-1);
  const resumo = `Gráfico de linha do saldo projetado de ${rotuloMesAno(inicial.mes)} a ${rotuloMesAno(final.mes)}: `
    + `começa em ${formatarMoeda(inicial.saldo)} e termina em ${formatarMoeda(final.saldo)}. `
    + (negativo ? `O saldo fica negativo em ${mesPorExtenso(primeiroNegativo)}.` : 'O saldo não fica negativo no período.');

  return (
    <section aria-labelledby="titulo-projecao" className="flex flex-col gap-4 rounded-md border border-border bg-surface p-6">
      <div className="flex flex-col gap-0.5">
        <h2 id="titulo-projecao" className="text-base">Projeção de saldo</h2>
        <p className="text-xs text-text-muted">
          Próximos 6 meses, mantendo o ritmo atual de gastos e as parcelas já registradas.
        </p>
      </div>

      {negativo && (
        <Aviso tom="alerta">Mantendo esse ritmo, seu saldo fica negativo em {mesPorExtenso(primeiroNegativo)}.</Aviso>
      )}

      <figure role="img" aria-label={resumo} aria-describedby={idDescricao} className="m-0">
        <Grafico serie={serie} />
        <figcaption id={idDescricao} className="sr-only">Os mesmos valores estão na tabela abaixo.</figcaption>
      </figure>

      <p className="flex flex-wrap items-center gap-x-1.5 text-xs text-text-muted">
        <span aria-hidden="true" className="size-2.5 rounded-full bg-chart-1" />
        Saldo projetado em conta
        <span className="text-text-subtle">
          · {negativo ? `o saldo fica negativo a partir de ${mesPorExtenso(primeiroNegativo)}` : 'o saldo não fica negativo no período'}
        </span>
      </p>

      <TabelaEquivalente serie={serie} />
    </section>
  );
}

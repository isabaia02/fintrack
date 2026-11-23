import { formatarMoeda, formatarPercentual } from '../../utils/formatadores';
import { Aviso } from '../ui/aviso';

const LIMIAR_AVISO = 80; 

export function LimiteCartao({ cartao }) {
  const { limite, limite_utilizado: utilizado, limite_disponivel: disponivel } = cartao;
  const percentual = limite > 0 ? (utilizado / limite) * 100 : 0;
  const estourado = disponivel < 0;
  const critico = estourado || percentual >= 100;
  const corBarra = critico ? 'bg-danger' : percentual > LIMIAR_AVISO ? 'bg-warning' : 'bg-primary';

  return (
    <section aria-label="Limite do cartão" className="flex flex-col gap-3">
      <div className="flex items-end justify-between">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-text-muted">Utilizado</span>
          <span className="font-mono text-2xl leading-8 font-medium tracking-[-0.01em]">{formatarMoeda(utilizado)}</span>
        </div>
        <div className="flex flex-col items-end gap-0.5">
          <span className="text-xs text-text-muted">Disponível</span>
          <span className={`font-mono text-2xl leading-8 font-medium tracking-[-0.01em] ${estourado ? 'text-danger' : 'text-income'}`}>
            {formatarMoeda(disponivel)}
          </span>
        </div>
      </div>

      <div
        role="progressbar"
        aria-label="Limite utilizado"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.min(Math.round(percentual), 100)}
        aria-valuetext={`${formatarPercentual(percentual)} do limite`}
        className="h-2 overflow-hidden rounded-sm bg-surface-sunken"
      >
        <div className={`h-full rounded-sm ${corBarra}`} style={{ width: `${Math.min(percentual, 100)}%` }} />
      </div>

      <div className="flex items-start justify-between gap-4 text-xs text-text-muted">
        <span>{formatarPercentual(percentual)} do limite de {formatarMoeda(limite)}</span>
        <span>Fecha dia {cartao.dia_fechamento} · vence dia {cartao.dia_vencimento}</span>
      </div>

      {(critico || percentual > LIMIAR_AVISO) && (
        <Aviso tom={critico ? 'erro' : 'alerta'}>
          {estourado && `Limite ultrapassado em ${formatarMoeda(-disponivel)}.`}
          {!estourado && critico && 'Você atingiu o limite do cartão.'}
          {!critico && `Você já usou ${formatarPercentual(percentual)} do limite. Restam ${formatarMoeda(disponivel)}.`}
        </Aviso>
      )}
    </section>
  );
}

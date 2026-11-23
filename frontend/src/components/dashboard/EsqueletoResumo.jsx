import { Divisor, PainelDetalhes } from './PainelDetalhes';

const bloco = 'shrink-0 animate-pulse bg-surface-sunken';

function LinhaCategoria() {
  return (
    <div className="flex h-9 items-center gap-3">
      <span className={`size-2.5 rounded-full ${bloco}`} />
      <span className={`h-3 w-[100px] rounded-sm ${bloco}`} />
      <span className={`h-2 w-[200px] rounded-[4px] ${bloco}`} />
      <span className={`h-3 w-[52px] rounded-sm ${bloco}`} />
      <span className={`h-3 min-w-0 flex-1 rounded-sm ${bloco}`} />
    </div>
  );
}

export function EsqueletoResumo() {
  return (
    <div role="status" aria-busy="true" aria-label="Carregando resumo" className="flex flex-col gap-8">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-3">
          <span className={`h-3 w-20 rounded-sm ${bloco}`} />
          <span className={`h-12 w-[280px] rounded-[8px] ${bloco}`} />
        </div>
        <Divisor />
      </div>
      <PainelDetalhes
        divisor={false}
        esquerda={(
          <>
            <span className={`h-6 w-[200px] rounded-sm ${bloco}`} />
            <div className="flex w-full max-w-[500px] flex-col gap-1">
              {Array.from({ length: 6 }, (_, i) => <LinhaCategoria key={i} />)}
            </div>
          </>
        )}
        direita={(
          <div className="flex flex-col gap-4">
            <span className={`h-6 w-40 rounded-sm ${bloco}`} />
            {Array.from({ length: 3 }, (_, i) => (
              <span key={i} className={`h-10 w-[380px] rounded-sm ${bloco}`} />
            ))}
          </div>
        )}
      />
    </div>
  );
}

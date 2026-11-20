import Icone from '../Icone';
import { usePeriodo } from '../../contexts/periodo';

export function SeletorPeriodo() {
  const { rotulo, anterior, proximo } = usePeriodo();
  const botao = 'flex h-8 w-5 items-center justify-center rounded-sm text-text-muted hover:bg-surface-sunken hover:text-text';

  return (
    <div role="group" aria-label="Período" className="inline-flex h-10 items-center gap-1 rounded-sm border border-border-strong bg-surface px-1">
      <button type="button" className={botao} onClick={anterior} aria-label="Mês anterior">
        <Icone nome="chevron_left" />
      </button>
      <span className="text-center text-sm font-medium" aria-live="polite">{rotulo}</span>
      <button type="button" className={botao} onClick={proximo} aria-label="Próximo mês">
        <Icone nome="chevron_right" />
      </button>
    </div>
  );
}

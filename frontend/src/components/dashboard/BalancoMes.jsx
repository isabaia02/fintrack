import { MoneyText } from '../ui/money-text';
import { formatarMoeda } from '../../utils/formatadores';
import { Divisor } from './PainelDetalhes';

function Fluxo({ rotulo, valor }) {
  return (
    <div className="flex flex-row-reverse items-center gap-2">
      <dt className="text-sm text-text-muted">{rotulo}</dt>
      <dd><MoneyText valor={valor} tamanho="lg" /></dd>
    </div>
  );
}

export function BalancoMes({ totais, primeiroUso = false }) {
  return (
    <section aria-label="Balanço do mês" className="flex flex-col gap-6">
      <div className="flex items-end justify-between gap-6">
        <div className="flex flex-col gap-1">
          <p className="text-sm text-text-muted">Saldo do mês</p>
          <p className={`text-display font-medium whitespace-nowrap ${primeiroUso ? 'text-text-subtle' : 'text-text'}`}>
            {formatarMoeda(totais.saldo)}
          </p>
        </div>
        {!primeiroUso && (
          <dl aria-label="Fluxo do mês" className="flex flex-col items-end gap-2">
            <Fluxo rotulo="entradas" valor={totais.entradas} />
            <Fluxo rotulo="saídas" valor={-totais.saidas} />
          </dl>
        )}
      </div>
      <Divisor />
    </section>
  );
}

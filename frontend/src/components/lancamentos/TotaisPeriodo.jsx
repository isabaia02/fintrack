import { MoneyText } from '../ui/money-text';

function Total({ rotulo, children }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-text-muted">{rotulo}</dt>
      <dd>{children}</dd>
    </div>
  );
}

export function TotaisPeriodo({ totais }) {
  return (
    <dl aria-label="Totais do período" className="flex items-stretch gap-8">
      <Total rotulo="Entradas">
        <MoneyText valor={totais.entradas} tamanho="lg" />
      </Total>
      <span aria-hidden="true" className="w-px bg-border" />
      <Total rotulo="Saídas">
        <MoneyText valor={-totais.saidas} tamanho="lg" />
      </Total>
      <span aria-hidden="true" className="w-px bg-border" />
      <Total rotulo="Saldo do período">
        <MoneyText valor={totais.saldo} tamanho="lg" comSinal={false} />
      </Total>
    </dl>
  );
}

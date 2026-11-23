import { MoneyText } from '../ui/money-text';
import { Secao } from './Secao';

export function SaldoPorConta({ contas }) {
  return (
    <Secao titulo="Saldo por conta" itens={contas} vazio="Nenhuma conta cadastrada.">
      <ul className="flex flex-col">
        {contas?.map((conta) => (
          <li key={conta.id} className="flex h-12 items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{conta.nome}</p>
              <p className="truncate text-xs text-text-muted">
                {conta.reserva ? 'Reserva de emergência' : 'Entradas menos saídas do mês'}
              </p>
            </div>
            <MoneyText valor={conta.saldo} comSinal={false} />
          </li>
        ))}
      </ul>
    </Secao>
  );
}

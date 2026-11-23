import { formatarMoeda } from '../../utils/formatadores';
import { fundoDaCategoria } from '../../utils/cores';
import { Carregando } from '../ui/carregando';
import { MensagemErro } from '../ui/mensagem-erro';
import { MoneyText } from '../ui/money-text';
import { useRelatorio } from './useRelatorio';

const corDaLinha = (indice) => fundoDaCategoria((indice % 8) + 1);

function CartaoBarras({ titulo, itens, vazio }) {
  const maximo = Math.max(0, ...itens.map((i) => i.total));
  return (
    <section aria-label={titulo} className="flex flex-col gap-2 rounded-md border border-border bg-surface p-6">
      <h3>{titulo}</h3>
      {itens.length === 0 ? (
        <p className="py-3 text-sm text-text-muted">{vazio}</p>
      ) : (
        <ul>
          {itens.map((item, i) => (
            <li key={item.id} className="flex h-11 items-center gap-3">
              <span aria-hidden="true" className={`size-2.5 shrink-0 rounded-full ${corDaLinha(i)}`} />
              <span className="w-[120px] shrink-0 truncate text-sm" title={item.nome}>{item.nome}</span>
              <div aria-hidden="true" className="h-2 min-w-0 flex-1 overflow-hidden rounded-sm bg-surface-sunken">
                <div className={`h-full rounded-sm ${corDaLinha(i)}`} style={{ width: `${maximo ? Math.max((item.total / maximo) * 100, 1.5) : 0}%` }} />
              </div>
              <span className="w-28 shrink-0 text-right font-mono text-sm">{formatarMoeda(item.total)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function SaldoPorConta({ contas, total }) {
  return (
    <section aria-label="Saldo por conta" className="flex flex-col gap-1 rounded-md border border-border bg-surface p-6 lg:w-[400px] lg:shrink-0">
      <h3>Saldo por conta</h3>
      {contas.length === 0 ? (
        <p className="py-3 text-sm text-text-muted">Nenhuma conta cadastrada.</p>
      ) : (
        <ul className="divide-y divide-border">
          {contas.map((conta) => (
            <li key={conta.id} className="flex h-14 items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{conta.nome}</p>
                <p className="text-xs text-text-muted">{conta.reserva ? 'Conta · reserva de emergência' : 'Conta'}</p>
              </div>
              <MoneyText valor={conta.saldo} tamanho="lg" comSinal={false} />
            </li>
          ))}
        </ul>
      )}
      <div className="flex h-12 items-center justify-between border-t border-border text-sm">
        <span className="text-text-muted">Total</span>
        <span className="font-mono">{formatarMoeda(total)}</span>
      </div>
    </section>
  );
}

export function PorFonteDestino({ periodo }) {
  const { dados, carregando, erro, recarregar } = useRelatorio('fontes-destinos', periodo);

  if (carregando) return <Carregando linhas={5} />;
  if (erro) return <MensagemErro mensagem={erro} onTentarDeNovo={recarregar} />;

  return (
    <div className="flex flex-col items-start gap-6 lg:flex-row">
      <div className="flex w-full min-w-0 flex-1 flex-col gap-6">
        <CartaoBarras titulo="Entradas por fonte" itens={dados.entradas.fontes} vazio="Nenhuma entrada neste período." />
        <CartaoBarras titulo="Saídas por destino" itens={dados.saidas.destinos} vazio="Nenhuma saída neste período." />
      </div>
      <SaldoPorConta contas={dados.contas} total={dados.saldoContas} />
    </div>
  );
}

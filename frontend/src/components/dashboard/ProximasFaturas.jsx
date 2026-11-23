import { BarraLimite } from '../ui/barra-limite';
import { MoneyText } from '../ui/money-text';
import { formatarData, formatarMoeda, formatarPercentual } from '../../utils/formatadores';
import { Secao } from './Secao';

const diaMes = (data) => formatarData(data).slice(0, 5);

function MedidorLimite({ cartao }) {
  const { nome, limite, limite_utilizado: utilizado } = cartao;
  const uso = (utilizado / limite) * 100;

  return (
    <>
      <BarraLimite nome={nome} utilizado={utilizado} limite={limite} className="w-[380px] max-w-full" />
      <div className="flex justify-between gap-4 text-xs text-text-muted">
        <p>Usado {formatarMoeda(utilizado)}</p>
        <p>{formatarPercentual(uso, 0)} de {formatarMoeda(limite)}</p>
      </div>
    </>
  );
}

function Cartao({ cartao }) {
  const fatura = cartao.faturas?.find((f) => f.aberta) ?? cartao.faturas?.[0];

  return (
    <li className="flex flex-col gap-3 border-t border-border pt-3 first:border-t-0 first:pt-0">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{cartao.nome}</p>
          {fatura && (
            <p className="text-xs text-text-muted">
              Fecha {diaMes(fatura.fechamento)} · vence {diaMes(fatura.vencimento)}
            </p>
          )}
        </div>
        <MoneyText valor={fatura?.total ?? 0} comSinal={false} />
      </div>
      {cartao.limite > 0 && <MedidorLimite cartao={cartao} />}
    </li>
  );
}

export function ProximasFaturas({ cartoes }) {
  return (
    <Secao titulo="Próximas faturas" itens={cartoes} vazio="Nenhum cartão cadastrado." className="gap-3">
      <ul className="flex flex-col gap-3">
        {cartoes?.map((c) => <Cartao key={c.id} cartao={c} />)}
      </ul>
    </Secao>
  );
}

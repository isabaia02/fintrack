import Icone from '../Icone';
import { Button } from './button';

export function MensagemErro({ mensagem = 'Não foi possível carregar os dados.', onTentarDeNovo }) {
  return (
    <div role="alert" className="flex flex-col items-start gap-3 rounded-md border border-danger bg-danger-soft p-4 text-danger">
      <p className="flex items-center gap-2 text-sm">
        <Icone nome="error_outline" tamanho={20} />
        {mensagem}
      </p>
      {onTentarDeNovo && <Button variante="danger" tamanho="sm" onClick={onTentarDeNovo}>Tentar de novo</Button>}
    </div>
  );
}

import Icone from '../Icone';
import { Button } from './button';

export function BannerErro({ titulo, detalhe, onTentarDeNovo }) {
  return (
    <div role="alert" className="flex items-center gap-3 rounded-sm bg-danger-soft p-4 text-danger">
      <Icone nome="error" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{titulo}</p>
        {detalhe && <p className="text-xs">{detalhe}</p>}
      </div>
      {onTentarDeNovo && (
        <Button variante="secondary" tamanho="sm" onClick={onTentarDeNovo}>Tentar de novo</Button>
      )}
    </div>
  );
}

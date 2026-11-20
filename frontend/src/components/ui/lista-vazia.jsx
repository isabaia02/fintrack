import { Button } from './button';

export function ListaVazia({ titulo, frase, acao }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-md border border-dashed border-border-strong px-6 py-12 text-center">
      <h3>{titulo}</h3>
      {frase && <p className="max-w-sm text-sm text-text-muted">{frase}</p>}
      {acao && <Button className="mt-2" onClick={acao.onClick}>{acao.rotulo}</Button>}
    </div>
  );
}

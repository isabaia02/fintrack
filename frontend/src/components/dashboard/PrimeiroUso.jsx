import Icone from '../Icone';
import { Button } from '../ui/button';

export function PrimeiroUso({ aoCriar }) {
  return (
    <section
      aria-label="Primeiro uso"
      className="flex flex-1 flex-col items-center justify-center gap-4 rounded-md border border-border bg-surface p-12 text-center"
    >
      <span className="flex size-14 items-center justify-center rounded-full bg-accent-soft text-primary">
        <Icone nome="receipt_long" tamanho={28} />
      </span>
      <div className="flex flex-col gap-1">
        <h2>Registre seu primeiro lançamento</h2>
        <p className="text-sm text-text-muted">Comece registrando o que entrou ou saiu hoje.</p>
      </div>
      <Button onClick={aoCriar}>
        <Icone nome="add" tamanho={18} />
        Novo lançamento
      </Button>
    </section>
  );
}

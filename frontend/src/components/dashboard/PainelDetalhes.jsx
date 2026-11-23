export function PainelDetalhes({ esquerda, direita, divisor = true }) {
  return (
    <div className="flex items-start gap-8 rounded-md border border-border bg-surface p-6">
      <div className="flex min-w-0 flex-1 flex-col gap-4">{esquerda}</div>
      {divisor && <span aria-hidden="true" className="w-px self-stretch bg-border" />}
      <div className="flex w-[420px] shrink-0 flex-col gap-6">{direita}</div>
    </div>
  );
}

export function Divisor() {
  return <span aria-hidden="true" className="h-px w-full bg-border" />;
}

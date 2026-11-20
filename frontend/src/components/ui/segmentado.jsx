// Com `desabilitado` usamos aria-disabled (e não `disabled`) para a opção ativa continuar
// focável: assim o leitor de tela chega ao grupo e lê a descrição (aria-describedby).
export function Segmentado({
  opcoes,
  valor,
  onChange,
  rotulo,
  cheio = false,
  desabilitado = false,
  'aria-describedby': descricaoId,
  'aria-invalid': invalido,
}) {
  return (
    <div
      role="group"
      aria-label={rotulo}
      aria-describedby={descricaoId}
      aria-invalid={invalido}
      className={`gap-1 rounded-sm bg-surface-sunken p-1 ${cheio ? 'flex w-full' : 'inline-flex'}`}
    >
      {opcoes.map((opcao) => {
        const ativo = opcao.valor === valor;
        return (
          <button
            key={opcao.valor}
            type="button"
            aria-pressed={ativo}
            aria-disabled={desabilitado || undefined}
            tabIndex={desabilitado && !ativo ? -1 : undefined}
            onClick={() => { if (!desabilitado) onChange(opcao.valor); }}
            className={`rounded-sm border text-sm whitespace-nowrap aria-disabled:cursor-not-allowed aria-disabled:opacity-60 ${cheio ? 'h-9 min-w-0 flex-1 px-2' : 'h-8 px-3'} ${
              ativo
                ? 'border-border bg-surface font-medium text-text'
                : 'border-transparent text-text-muted not-aria-disabled:hover:text-text'
            }`}
          >
            {opcao.rotulo}
          </button>
        );
      })}
    </div>
  );
}

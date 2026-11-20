export function Segmentado({ opcoes, valor, onChange, rotulo, cheio = false, desabilitado = false, 'aria-describedby': descricaoId }) {
  return (
    <div role="group" aria-label={rotulo} aria-describedby={descricaoId} className={`gap-1 rounded-sm bg-surface-sunken p-1 ${cheio ? 'flex w-full' : 'inline-flex'}`}>
      {opcoes.map((opcao) => {
        const ativo = opcao.valor === valor;
        return (
          <button
            key={opcao.valor}
            type="button"
            aria-pressed={ativo}
            disabled={desabilitado}
            onClick={() => onChange(opcao.valor)}
            className={`rounded-sm border text-sm whitespace-nowrap disabled:cursor-not-allowed ${cheio ? 'h-9 min-w-0 flex-1 px-2' : 'h-8 px-3'} ${
              ativo
                ? 'border-border bg-surface font-medium text-text'
                : 'border-transparent text-text-muted hover:text-text'
            }`}
          >
            {opcao.rotulo}
          </button>
        );
      })}
    </div>
  );
}

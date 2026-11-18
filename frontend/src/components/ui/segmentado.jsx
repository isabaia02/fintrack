export function Segmentado({ opcoes, valor, onChange, rotulo }) {
  return (
    <div role="group" aria-label={rotulo} className="inline-flex gap-1 rounded-sm bg-surface-sunken p-1">
      {opcoes.map((opcao) => {
        const ativo = opcao.valor === valor;
        return (
          <button
            key={opcao.valor}
            type="button"
            aria-pressed={ativo}
            onClick={() => onChange(opcao.valor)}
            className={`h-8 rounded-sm border px-3 text-sm ${
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

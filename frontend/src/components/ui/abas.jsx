import { useId } from 'react';

export function Abas({ abas, ativa, onChange, rotulo, idBase }) {
  const gerado = useId();
  const base = idBase ?? gerado;

  function aoTeclar(e, indice) {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const proximo = (indice + (e.key === 'ArrowRight' ? 1 : -1) + abas.length) % abas.length;
    onChange(abas[proximo].valor);
    document.getElementById(`${base}-aba-${abas[proximo].valor}`)?.focus();
  }

  return (
    <div role="tablist" aria-label={rotulo} className="flex gap-6 border-b border-border">
      {abas.map((aba, i) => {
        const selecionada = aba.valor === ativa;
        return (
          <button
            key={aba.valor}
            id={`${base}-aba-${aba.valor}`}
            type="button"
            role="tab"
            aria-selected={selecionada}
            aria-controls={`${base}-painel-${aba.valor}`}
            tabIndex={selecionada ? 0 : -1}
            onClick={() => onChange(aba.valor)}
            onKeyDown={(e) => aoTeclar(e, i)}
            className={`-mb-px flex flex-col items-start gap-2.5 px-1 text-sm ${
              selecionada ? 'font-medium text-text' : 'text-text-muted hover:text-text'
            }`}
          >
            {aba.rotulo}
            <span className={`h-0.5 w-full ${selecionada ? 'bg-primary' : 'bg-transparent'}`} />
          </button>
        );
      })}
    </div>
  );
}

export function PainelAba({ idBase, valor, children }) {
  return (
    <div role="tabpanel" id={`${idBase}-painel-${valor}`} aria-labelledby={`${idBase}-aba-${valor}`} tabIndex={0}>
      {children}
    </div>
  );
}

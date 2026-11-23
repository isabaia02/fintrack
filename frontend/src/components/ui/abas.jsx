import { useId } from 'react';

export function Abas({ abas, ativa, onChange, rotulo, idBase }) {
  const gerado = useId();
  const base = idBase ?? gerado;

  function aoTeclar(e, indice) {
    const passo = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
    if (passo === undefined && e.key !== 'Home' && e.key !== 'End') return;
    e.preventDefault();
    let proximo = (indice + passo + abas.length) % abas.length;
    if (e.key === 'Home') proximo = 0;
    if (e.key === 'End') proximo = abas.length - 1;
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
            aria-controls={selecionada ? `${base}-painel-${aba.valor}` : undefined}
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

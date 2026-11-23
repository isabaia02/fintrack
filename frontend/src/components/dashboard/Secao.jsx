export function Secao({ titulo, acao, itens, vazio, className = 'gap-2', children }) {
  let conteudo = children;
  if (itens === null) {
    conteudo = (
      <p className="text-sm text-text-subtle">
        <span aria-hidden="true">—</span>
        <span className="sr-only">Indisponível no momento.</span>
      </p>
    );
  } else if (itens.length === 0) {
    conteudo = <p className="text-sm text-text-muted">{vazio}</p>;
  }

  return (
    <section aria-label={titulo} className={`flex flex-col ${className}`}>
      <div className="flex items-center justify-between gap-4">
        <h2>{titulo}</h2>
        {itens !== null && acao}
      </div>
      {conteudo}
    </section>
  );
}

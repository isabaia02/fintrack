import Icone from '../Icone';

export function Dicas({ dicas }) {
  return (
    <section aria-labelledby="titulo-dicas" className="flex flex-col gap-3 rounded-md border border-border bg-surface p-6">
      <h2 id="titulo-dicas" className="text-base">Dicas para o próximo mês</h2>
      {dicas.length === 0 ? (
        <p className="text-sm text-text-muted">Sem dicas por enquanto. Registre mais lançamentos para receber sugestões.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {dicas.map((dica) => (
            <li key={dica.id} className="flex items-start gap-3 text-sm">
              <span className="text-primary"><Icone nome="trending_up" /></span>
              <p className="min-w-0 flex-1">
                {dica.texto}
                {dica.origem === 'ia' && <span className="ml-1 text-xs text-text-muted">(sugestão gerada por IA)</span>}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

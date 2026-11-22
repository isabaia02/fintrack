import Icone from '../Icone';

const botao =
  'flex size-8 items-center justify-center rounded-sm border border-border-strong text-text hover:bg-surface-sunken disabled:cursor-not-allowed disabled:border-transparent disabled:text-text-subtle disabled:hover:bg-transparent';

export function Paginacao({ pagina, totalPaginas, total, tamanhoPagina, quantidade, unidade = ['item', 'itens'], onChange }) {
  const inicio = total === 0 ? 0 : (pagina - 1) * tamanhoPagina + 1;
  const fim = total === 0 ? 0 : inicio + quantidade - 1;
  const nome = total === 1 ? unidade[0] : unidade[1];

  return (
    <nav aria-label="Paginação" className="flex h-14 items-center justify-between px-5">
      <p className="text-xs text-text-muted">{inicio}–{fim} de {total} {nome}</p>
      {totalPaginas > 1 && (
        <div className="flex items-center gap-1">
          <button type="button" className={botao} disabled={pagina <= 1} onClick={() => onChange(pagina - 1)} aria-label="Página anterior">
            <Icone nome="chevron_left" />
          </button>
          <span className="text-xs text-text" aria-live="polite">{pagina} de {totalPaginas}</span>
          <button type="button" className={botao} disabled={pagina >= totalPaginas} onClick={() => onChange(pagina + 1)} aria-label="Próxima página">
            <Icone nome="chevron_right" />
          </button>
        </div>
      )}
    </nav>
  );
}

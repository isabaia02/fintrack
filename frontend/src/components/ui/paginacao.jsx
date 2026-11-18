import { Button } from './button';

export function Paginacao({ pagina, totalPaginas, onChange }) {
  if (!totalPaginas || totalPaginas <= 1) return null;
  return (
    <nav aria-label="Paginação" className="flex items-center justify-end gap-3">
      <span className="text-sm text-text-muted">Página {pagina} de {totalPaginas}</span>
      <Button variante="secondary" tamanho="sm" disabled={pagina <= 1} onClick={() => onChange(pagina - 1)}>Anterior</Button>
      <Button variante="secondary" tamanho="sm" disabled={pagina >= totalPaginas} onClick={() => onChange(pagina + 1)}>Próxima</Button>
    </nav>
  );
}

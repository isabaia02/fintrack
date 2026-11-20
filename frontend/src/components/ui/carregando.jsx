export function Carregando({ linhas = 3, className = '' }) {
  return (
    <div role="status" aria-busy="true" aria-label="Carregando" className={`flex flex-col gap-3 ${className}`}>
      {Array.from({ length: linhas }, (_, i) => (
        <div key={i} className="h-10 animate-pulse rounded-sm bg-surface-sunken" style={{ width: i === linhas - 1 ? '60%' : '100%' }} />
      ))}
    </div>
  );
}

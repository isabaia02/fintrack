const USO_ALERTA = 80;

export function BarraLimite({ nome, utilizado, limite, className = '' }) {
  const uso = limite > 0 ? (utilizado / limite) * 100 : 0;

  return (
    <div
      role="meter"
      aria-label={`Limite usado de ${nome}`}
      aria-valuemin={0}
      aria-valuemax={limite}
      aria-valuenow={Math.min(utilizado, limite)}
      className={`h-1.5 overflow-hidden rounded-[3px] bg-surface-sunken ${className}`}
    >
      <div
        className={`h-full rounded-[3px] ${uso > USO_ALERTA ? 'bg-warning' : 'bg-primary'}`}
        style={{ width: `${Math.min(uso, 100)}%` }}
      />
    </div>
  );
}

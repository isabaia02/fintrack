const tons = {
  neutro: 'bg-surface-sunken text-text-muted',
  entrada: 'bg-income-soft text-income',
  alerta: 'bg-warning-soft text-warning',
  erro: 'bg-danger-soft text-danger',
  info: 'bg-accent-soft text-primary',
};

export function Badge({ tom = 'neutro', children }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${tons[tom]}`}>
      {children}
    </span>
  );
}

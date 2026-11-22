import Icone from '../Icone';

const tons = {
  erro: { classe: 'bg-danger-soft text-danger', icone: 'error', papel: 'alert' },
  info: { classe: 'bg-accent-soft text-primary', icone: 'info', papel: 'status' },
  alerta: { classe: 'bg-warning-soft text-warning', icone: 'warning', papel: 'status' },
  sucesso: { classe: 'bg-income-soft text-income', icone: 'check_circle', papel: 'status' },
};

export function Aviso({ tom = 'info', children }) {
  const { classe, icone, papel } = tons[tom];

  return (
    <div role={papel} className={`flex items-center gap-2 rounded-sm p-3 text-sm font-medium ${classe}`}>
      <Icone nome={icone} />
      <p className="min-w-0 flex-1">{children}</p>
    </div>
  );
}

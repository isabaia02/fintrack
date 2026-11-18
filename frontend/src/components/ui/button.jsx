import Icone from '../Icone';

const base =
  'inline-flex items-center justify-center gap-2 rounded-sm text-sm font-medium whitespace-nowrap disabled:cursor-not-allowed disabled:border-transparent disabled:bg-surface-sunken disabled:text-text-subtle';

const variantes = {
  primary: 'bg-primary text-on-primary hover:bg-primary-hover',
  secondary: 'border border-border-strong bg-surface text-text hover:bg-surface-sunken',
  ghost: 'text-text hover:bg-surface-sunken',
  danger: 'border border-danger bg-surface text-danger hover:bg-danger-soft',
};

const tamanhos = {
  md: 'h-10 px-4',
  sm: 'h-8 px-3',
};

export function Button({ variante = 'primary', tamanho = 'md', carregando = false, disabled, className = '', children, ...props }) {
  return (
    <button
      type="button"
      className={`${base} ${variantes[variante]} ${tamanhos[tamanho]} ${className}`}
      disabled={carregando || disabled}
      {...props}
    >
      {carregando && <Icone nome="autorenew" tamanho={18} girando />}
      {children}
    </button>
  );
}

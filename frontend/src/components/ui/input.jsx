export const estiloCampo =
  'h-10 w-full rounded-sm border border-border-strong bg-surface px-3 text-sm text-text placeholder:text-text-subtle focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary focus-visible:outline-none disabled:cursor-not-allowed disabled:bg-surface-sunken aria-invalid:border-danger';

export function Input({ className = '', ...props }) {
  return <input className={`${estiloCampo} ${className}`} {...props} />;
}

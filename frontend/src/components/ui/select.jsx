import Icone from '../Icone';
import { estiloCampo } from './input';

export function Select({ className = '', children, ...props }) {
  return (
    <div className="relative">
      <select className={`${estiloCampo} appearance-none pr-9 ${className}`} {...props}>
        {children}
      </select>
      <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-text-muted">
        <Icone nome="expand_more" tamanho={18} />
      </span>
    </div>
  );
}

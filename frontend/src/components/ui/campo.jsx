import { cloneElement, isValidElement, useId } from 'react';
import Icone from '../Icone';

export function Campo({ label, ajuda, erro, children, className = '' }) {
  const id = useId();
  const descricaoId = erro || ajuda ? `${id}-desc` : undefined;
  const props = { id, 'aria-invalid': erro ? true : undefined, 'aria-describedby': descricaoId };

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={id} className="text-sm font-medium text-text">{label}</label>
      {typeof children === 'function' ? children(props) : isValidElement(children) ? cloneElement(children, props) : children}
      {erro ? (
        <p id={descricaoId} className="flex items-center gap-1 text-xs text-danger">
          <Icone nome="error_outline" tamanho={16} />
          {erro}
        </p>
      ) : ajuda ? (
        <p id={descricaoId} className="text-xs text-text-muted">{ajuda}</p>
      ) : null}
    </div>
  );
}

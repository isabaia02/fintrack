import { useState } from 'react';
import Icone from '../Icone';
import { Input } from './input';

export function InputSenha(props) {
  const [visivel, setVisivel] = useState(false);

  return (
    <div className="relative">
      <Input type={visivel ? 'text' : 'password'} className="pr-11" {...props} />
      <button
        type="button"
        onClick={() => setVisivel((atual) => !atual)}
        aria-label={visivel ? 'Ocultar senha' : 'Mostrar senha'}
        aria-pressed={visivel}
        className="absolute top-1/2 right-3 flex -translate-y-1/2 text-text-muted hover:text-text"
      >
        <Icone nome={visivel ? 'visibility_off' : 'visibility'} />
      </button>
    </div>
  );
}

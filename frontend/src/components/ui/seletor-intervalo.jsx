import { useEffect, useRef, useState } from 'react';
import { formatarData } from '../../utils/formatadores';
import { periodosPredefinidos } from '../../utils/periodos';
import Icone from '../Icone';
import { Button } from './button';
import { Input } from './input';

export function SeletorIntervalo({ valor, onChange }) {
  const [aberto, setAberto] = useState(false);
  const [inicio, setInicio] = useState(valor.inicio);
  const [fim, setFim] = useState(valor.fim);
  const [erro, setErro] = useState('');
  const raiz = useRef(null);
  const predefinidos = periodosPredefinidos();

  useEffect(() => {
    if (!aberto) return undefined;
    const fecharFora = (e) => { if (!raiz.current?.contains(e.target)) setAberto(false); };
    const fecharEsc = (e) => { if (e.key === 'Escape') setAberto(false); };
    document.addEventListener('mousedown', fecharFora);
    document.addEventListener('keydown', fecharEsc);
    return () => {
      document.removeEventListener('mousedown', fecharFora);
      document.removeEventListener('keydown', fecharEsc);
    };
  }, [aberto]);

  const alternar = () => {
    if (!aberto) {
      setInicio(valor.inicio);
      setFim(valor.fim);
      setErro('');
    }
    setAberto(!aberto);
  };

  const escolher = (periodo) => {
    onChange({ id: periodo.id, inicio: periodo.inicio, fim: periodo.fim });
    setAberto(false);
  };

  function aplicarPersonalizado(e) {
    e.preventDefault();
    if (!inicio || !fim) return setErro('Informe as duas datas.');
    if (inicio > fim) return setErro('A data final deve ser igual ou posterior à inicial.');
    onChange({ id: 'personalizado', inicio, fim });
    return setAberto(false);
  }

  const item = (ativo) => `flex h-9 w-full items-center rounded-sm px-3 text-left text-sm hover:bg-surface-sunken ${ativo ? 'bg-accent-soft font-medium text-primary' : 'text-text'}`;

  return (
    <div ref={raiz} className="relative">
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={aberto}
        onClick={alternar}
        className="inline-flex h-10 items-center gap-2 rounded-sm border border-border-strong bg-surface px-3 text-sm hover:bg-surface-sunken"
      >
        <span className="text-text-muted">Período</span>
        <span className="font-medium">{formatarData(valor.inicio)} – {formatarData(valor.fim)}</span>
        <span className="text-text-muted"><Icone nome="expand_more" tamanho={18} /></span>
      </button>

      {aberto && (
        <div role="dialog" aria-label="Escolher período" className="absolute top-full left-0 z-10 mt-1 w-72 rounded-md border border-border bg-surface p-1 shadow-popover">
          {predefinidos.map((p) => (
            <button key={p.id} type="button" className={item(valor.id === p.id)} onClick={() => escolher(p)}>
              {p.rotulo}
            </button>
          ))}
          <form onSubmit={aplicarPersonalizado} noValidate className="mt-1 flex flex-col gap-2 border-t border-border p-3">
            <span className={`text-sm ${valor.id === 'personalizado' ? 'font-medium text-primary' : 'font-medium'}`}>Personalizado</span>
            <div className="flex items-center gap-2">
              <Input type="date" aria-label="Data inicial" value={inicio} onChange={(e) => setInicio(e.target.value)} className="min-w-0 flex-1 px-2" />
              <Input type="date" aria-label="Data final" value={fim} onChange={(e) => setFim(e.target.value)} className="min-w-0 flex-1 px-2" />
            </div>
            {erro && <p role="alert" className="text-xs text-danger">{erro}</p>}
            <Button type="submit" tamanho="sm" className="self-end">Aplicar</Button>
          </form>
        </div>
      )}
    </div>
  );
}

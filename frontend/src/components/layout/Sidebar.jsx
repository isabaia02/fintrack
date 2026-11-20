import { NavLink, useNavigate } from 'react-router-dom';
import Icone from '../Icone';
import { useAuth } from '../../contexts/AuthContext';
import logoMark from '../../assets/logo-mark.png';
import { PAGINAS } from './navegacao';

export default function Sidebar() {
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();
  const nome = usuario?.nome ?? '';
  const iniciais = nome.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase();

  const sair = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col gap-6 border border-border bg-surface px-3 pt-6 pb-4">
      <div className="flex items-center gap-2 px-3">
        <img src={logoMark} alt="" className="h-7 w-[30px] object-contain" />
        <span className="text-base font-semibold">FinTrack</span>
      </div>

      <nav aria-label="Principal" className="flex min-h-px flex-1 flex-col gap-1">
        {PAGINAS.map((p, i) =>
          p.divisor ? (
            <hr key={`div-${i}`} className="h-px border-0 bg-border" />
          ) : (
            <NavLink
              key={p.caminho}
              to={p.caminho}
              end={p.caminho === '/'}
              className={({ isActive }) =>
                `flex h-10 items-center gap-3 rounded-sm px-3 text-sm ${
                  isActive ? 'bg-accent-soft font-medium text-primary' : 'text-text-muted hover:bg-surface-sunken'
                }`
              }
            >
              <Icone nome={p.icone} />
              {p.titulo}
            </NavLink>
          ),
        )}
      </nav>

      <button
        type="button"
        onClick={sair}
        className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-left hover:bg-surface-sunken"
      >
        <span aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs text-primary">
          {iniciais || '?'}
        </span>
        <span className="flex min-w-0 flex-1 flex-col whitespace-nowrap">
          <span className="truncate text-sm font-medium leading-5" title={nome}>{nome}</span>
          <span className="text-xs leading-4 text-text-muted">Sair da conta</span>
        </span>
        <span className="text-text-muted"><Icone nome="logout" /></span>
      </button>
    </aside>
  );
}

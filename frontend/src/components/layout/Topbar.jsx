import { useLocation, useNavigate } from 'react-router-dom';
import Icone from '../Icone';
import { Button } from '../ui/button';
import { SeletorPeriodo } from '../ui/seletor-periodo';
import { paginaDaRota } from './navegacao';

export default function Topbar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const pagina = paginaDaRota(pathname);

  return (
    <header className="mb-8 flex items-center justify-between gap-4">
      <h1>{pagina?.titulo}</h1>
      <div className="flex items-center gap-4">
        {pagina?.periodo && <SeletorPeriodo />}
        {/* O formulário de lançamento (FE-06) abrirá a partir deste parâmetro. */}
        <Button onClick={() => navigate('/lancamentos?novo=1')}>
          <Icone nome="add" tamanho={18} />
          Novo lançamento
        </Button>
      </div>
    </header>
  );
}

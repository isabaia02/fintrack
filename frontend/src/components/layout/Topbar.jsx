import { useLocation, useNavigate } from 'react-router-dom';
import Icone from '../Icone';
import { Button } from '../ui/button';
import { SeletorPeriodo } from '../ui/seletor-periodo';
import { ACAO_PADRAO, paginaDaRota } from './navegacao';

export default function Topbar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const pagina = paginaDaRota(pathname);
  const acao = pagina?.acao ?? ACAO_PADRAO;

  return (
    <header className="mb-8 flex items-center justify-between gap-4">
      <h1>{pagina?.titulo}</h1>
      <div className="flex items-center gap-4">
        {pagina?.periodo && <SeletorPeriodo />}
        <Button onClick={() => navigate(acao.destino)}>
          <Icone nome="add" tamanho={18} />
          {acao.rotulo}
        </Button>
      </div>
    </header>
  );
}

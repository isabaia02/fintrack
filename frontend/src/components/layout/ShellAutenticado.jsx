import { useEffect, useMemo, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { PeriodoProvider } from '../../contexts/PeriodoContext';
import { tipoDaFalha } from '../../services/api';
import { EstadoPagina } from '../ui/estado-pagina';
import { paginaDaRota } from './navegacao';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

const enderecoAtual = () => window.location.pathname + window.location.search;

export default function ShellAutenticado() {
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  const [acaoBloqueada, setAcaoBloqueada] = useState(false);
  const [falha, setFalha] = useState(null);

  const contexto = useMemo(() => ({
    bloquearAcao: setAcaoBloqueada,
    mostrarErro: (erro) => {
      const tipo = tipoDaFalha(erro);
      if (tipo) setFalha({ tipo, endereco: enderecoAtual() });
      return Boolean(tipo);
    },
  }), []);

  useEffect(() => {
    const aoReconectar = () => setFalha((atual) => (atual?.tipo === 'sem-conexao' ? null : atual));
    window.addEventListener('online', aoReconectar);
    return () => window.removeEventListener('online', aoReconectar);
  }, []);

  const falhaAtual = falha?.endereco === pathname + search ? falha : null;

  const voltarAoResumo = () => {
    setFalha(null);
    navigate('/');
  };

  return (
    <PeriodoProvider>
      <div className="flex min-h-screen bg-bg">
        <Sidebar />
        <main className="flex min-w-0 flex-1 flex-col px-10 py-8">
          <div className="mx-auto flex w-full max-w-[1120px] flex-1 flex-col">
            {falhaAtual ? (
              <EstadoPagina
                tipo={falhaAtual.tipo}
                onTentarDeNovo={() => setFalha(null)}
                onVoltarAoResumo={voltarAoResumo}
              />
            ) : (
              <>
                {paginaDaRota(pathname) && <Topbar acaoBloqueada={acaoBloqueada} />}
                <Outlet context={contexto} />
              </>
            )}
          </div>
        </main>
      </div>
    </PeriodoProvider>
  );
}

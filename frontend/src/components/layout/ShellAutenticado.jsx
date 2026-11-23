import { useMemo, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { PeriodoProvider } from '../../contexts/PeriodoContext';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

export default function ShellAutenticado() {
  const [acaoBloqueada, setAcaoBloqueada] = useState(false);
  const contexto = useMemo(() => ({ bloquearAcao: setAcaoBloqueada }), []);

  return (
    <PeriodoProvider>
      <div className="flex min-h-screen bg-bg">
        <Sidebar />
        <main className="flex min-w-0 flex-1 flex-col px-10 py-8">
          <div className="mx-auto flex w-full max-w-[1120px] flex-1 flex-col">
            <Topbar acaoBloqueada={acaoBloqueada} />
            <Outlet context={contexto} />
          </div>
        </main>
      </div>
    </PeriodoProvider>
  );
}

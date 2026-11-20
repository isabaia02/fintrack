import { Outlet } from 'react-router-dom';
import { PeriodoProvider } from '../../contexts/PeriodoContext';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

export default function ShellAutenticado() {
  return (
    <PeriodoProvider>
      <div className="flex min-h-screen bg-bg">
        <Sidebar />
        <main className="min-w-0 flex-1 px-10 py-8">
          <div className="mx-auto max-w-[1120px]">
            <Topbar />
            <Outlet />
          </div>
        </main>
      </div>
    </PeriodoProvider>
  );
}

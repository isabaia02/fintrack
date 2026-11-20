import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import RotaProtegida from './components/RotaProtegida';
import ShellAutenticado from './components/layout/ShellAutenticado';
import Login from './components/Login';
import Cadastro from './components/Cadastro';
import Dashboard from './components/Dashboard';
import Lancamentos from './components/Lancamentos';
import Categorias from './components/Categorias';
import FontesDestinos from './components/FontesDestinos';
import Relatorios from './components/Relatorios';
import Faturas from './components/Faturas';
import SaudeFinanceira from './components/SaudeFinanceira';
import NaoEncontrado from './components/NaoEncontrado';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/cadastro" element={<Cadastro />} />
          <Route element={<RotaProtegida />}>
            <Route element={<ShellAutenticado />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/lancamentos" element={<Lancamentos />} />
              <Route path="/categorias" element={<Categorias />} />
              <Route path="/fontes-destinos" element={<FontesDestinos />} />
              <Route path="/relatorios" element={<Relatorios />} />
              <Route path="/faturas" element={<Faturas />} />
              <Route path="/saude-financeira" element={<SaudeFinanceira />} />
            </Route>
          </Route>
          <Route path="*" element={<NaoEncontrado />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import RotaProtegida from './components/RotaProtegida';
import Login from './components/Login';
import Cadastro from './components/Cadastro';
import Dashboard from './components/Dashboard';
import Lancamentos from './components/Lancamentos';
import Categorias from './components/Categorias';
import FontesDestinos from './components/FontesDestinos';
import Relatorios from './components/Relatorios';
import Faturas from './components/Faturas';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/cadastro" element={<Cadastro />} />
          <Route element={<RotaProtegida />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/lancamentos" element={<Lancamentos />} />
            <Route path="/categorias" element={<Categorias />} />
            <Route path="/fontes-destinos" element={<FontesDestinos />} />
            <Route path="/relatorios" element={<Relatorios />} />
            <Route path="/faturas" element={<Faturas />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function RotaProtegida() {
  const { token, carregando } = useAuth();
  if (carregando) return <p>Carregando...</p>;
  return token ? <Outlet /> : <Navigate to="/login" replace />;
}

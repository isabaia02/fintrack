import { useNavigate } from 'react-router-dom';
import { EstadoPagina } from './ui/estado-pagina';

export default function NaoEncontrado() {
  const navigate = useNavigate();
  return <EstadoPagina tipo="nao-encontrado" onVoltarAoResumo={() => navigate('/')} />;
}

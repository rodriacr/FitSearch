import { Navigate, Outlet } from 'react-router-dom';
import { useSesion } from '../context/SesionContext.jsx';

export default function RutaProtegida() {
  const { sesion } = useSesion();
  return sesion ? <Outlet /> : <Navigate to="/iniciar-sesion" replace />;
}

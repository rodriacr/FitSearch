import { Navigate, Outlet } from 'react-router-dom';
import { useSesion } from '../context/SesionContext.jsx';

// Sin sesión: tras un cierre voluntario se vuelve a la portada; en cualquier otro caso
// (enlace directo, sesión expirada) se pide iniciar sesión.
export default function RutaProtegida() {
  const { sesion, aviso } = useSesion();
  if (sesion) return <Outlet />;
  return <Navigate to={aviso?.origen === 'cierre' ? '/' : '/iniciar-sesion'} replace />;
}

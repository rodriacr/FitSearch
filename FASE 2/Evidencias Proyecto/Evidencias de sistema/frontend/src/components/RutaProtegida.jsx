import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useSesion } from '../context/SesionContext.jsx';

// Sin sesión: tras un cierre voluntario se vuelve a la portada; en cualquier otro caso
// (enlace directo, sesión expirada) se pide iniciar sesión y se recuerda la página pedida,
// con sus filtros, para volver a ella después de entrar (por ejemplo, una búsqueda compartida).
export default function RutaProtegida() {
  const { sesion, aviso } = useSesion();
  const { pathname, search } = useLocation();
  if (sesion) return <Outlet />;
  if (aviso?.origen === 'cierre') return <Navigate to="/" replace />;
  return <Navigate to="/iniciar-sesion" replace state={{ desde: `${pathname}${search}` }} />;
}

import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useSesion } from '../context/SesionContext.jsx';
import { ELEGIR_PERFIL, inicioDe } from '../services/navegacion.js';

// Sin sesión: tras un cierre voluntario se vuelve a la portada; en cualquier otro caso
// (enlace directo, sesión expirada) se pide iniciar sesión y se recuerda la página pedida,
// con sus filtros, para volver a ella después de entrar (por ejemplo, una búsqueda compartida).
// Con "rol", además, cada espacio es solo de su rol (DAS, D25): una cuenta sin rol elegido va a "Elegir perfil"
// y una de otro rol, a su propio Inicio.
export default function RutaProtegida({ rol }) {
  const { sesion, aviso } = useSesion();
  const { pathname, search } = useLocation();
  if (!sesion) {
    if (aviso?.origen === 'cierre') return <Navigate to="/" replace />;
    return <Navigate to="/iniciar-sesion" replace state={{ desde: `${pathname}${search}` }} />;
  }
  if (rol && sesion.usuario.rolConfirmado === false) return <Navigate to={ELEGIR_PERFIL} replace />;
  if (rol && sesion.usuario.rol !== rol) return <Navigate to={inicioDe(sesion.usuario)} replace />;
  return <Outlet />;
}

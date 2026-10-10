import { Navigate } from 'react-router-dom';
import PantallaAcceso from '../components/PantallaAcceso.jsx';
import { useSesion } from '../context/SesionContext.jsx';
import { ACCESO_NO_DISPONIBLE, inicioDe } from '../services/navegacion.js';

export default function AccesoNoDisponible() {
  const { sesion, cerrarSesion } = useSesion();
  const inicio = inicioDe(sesion?.usuario);
  if (inicio !== ACCESO_NO_DISPONIBLE) return <Navigate to={inicio} replace />;
  return (
    <PantallaAcceso>
      <h1>Acceso no disponible</h1>
      <p>Tu cuenta todavía no tiene un espacio disponible en FitSearch.</p>
      <button type="button" className="boton boton--principal" onClick={cerrarSesion}>Cerrar sesión</button>
    </PantallaAcceso>
  );
}

import PantallaAcceso from '../components/PantallaAcceso.jsx';
import { useSesion } from '../context/SesionContext.jsx';

export default function AccesoNoDisponible() {
  const { cerrarSesion } = useSesion();
  return (
    <PantallaAcceso>
      <h1>Acceso no disponible</h1>
      <p>Tu cuenta todavía no tiene un espacio disponible en FitSearch.</p>
      <button type="button" className="boton boton--principal" onClick={cerrarSesion}>Cerrar sesión</button>
    </PantallaAcceso>
  );
}

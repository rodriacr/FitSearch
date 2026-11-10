import { Link } from 'react-router-dom';
import Alerta from '../Alerta.jsx';
import EstadoVacio from '../EstadoVacio.jsx';
import { SECCIONES_PROFESIONAL as SECCIONES } from '../diseno/secciones.js';

// Error al cargar Clientes o Reportes. Un 409 significa que el profesional aún no tiene ficha: se le lleva a crearla.
export default function ErrorCarga({ error, reintentar }) {
  if (error.estado === 409) {
    return (
      <EstadoVacio icono="medico" titulo="Completa tu ficha profesional" nivel={2}
        accion={<Link to={SECCIONES.perfil.ruta} className="boton boton--principal boton--compacto">Completar ficha</Link>}>
        {error.message}
      </EstadoVacio>
    );
  }
  return (
    <div className="carga-error">
      <Alerta>{error.message}</Alerta>
      <button type="button" className="boton boton--secundario boton--compacto" onClick={reintentar}>Reintentar</button>
    </div>
  );
}

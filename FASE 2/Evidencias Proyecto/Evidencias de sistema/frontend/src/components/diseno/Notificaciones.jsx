import Icono from '../Icono.jsx';
import useDesplegable from './useDesplegable.js';

// Aún no existe un sistema de notificaciones: la campana abre un aviso vacío, sin indicador de novedades.
export default function Notificaciones() {
  const { abierto, setAbierto, contenedor, boton } = useDesplegable();
  return (
    <div className="desplegable" ref={contenedor}>
      <button ref={boton} type="button" className="boton-icono" aria-label="Notificaciones" aria-expanded={abierto}
        aria-controls="panel-notificaciones" onClick={() => setAbierto(!abierto)}>
        <Icono nombre="campana" tamano={22} />
      </button>
      {abierto && (
        <div id="panel-notificaciones" className="desplegable__panel notificaciones__panel">
          <p className="notificaciones__titulo">Notificaciones</p>
          <div className="notificaciones__vacio">
            <Icono nombre="campana" tamano={28} />
            <p><strong>No tienes notificaciones</strong>Te avisaremos aquí cuando haya novedades en tu cuenta.</p>
          </div>
        </div>
      )}
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useSesion } from '../../context/SesionContext.jsx';
import { solicitar } from '../../services/api.js';
import Icono from '../Icono.jsx';
import useDesplegable from './useDesplegable.js';

const CADA_SEGUNDOS = 60;

// Campana del encabezado. Desde FS-HU-31 avisa los mensajes sin leer de los chats: se consulta al cargar, al cambiar
// de pantalla y cada minuto (si la pestaña está a la vista).
export default function Notificaciones() {
  const { abierto, setAbierto, contenedor, boton } = useDesplegable();
  const { sesion } = useSesion();
  const { pathname } = useLocation();
  const rol = sesion?.usuario.rol;
  const conMensajes = rol === 'usuario' || rol === 'profesional';
  const [noLeidos, setNoLeidos] = useState(0);

  useEffect(() => {
    if (!conMensajes) return undefined;
    let activo = true;
    const consultar = () => solicitar('/chats/no-leidos').then(({ total }) => activo && setNoLeidos(total)).catch(() => {});
    consultar();
    const temporizador = setInterval(() => { if (document.visibilityState !== 'hidden') consultar(); }, CADA_SEGUNDOS * 1000);
    return () => { activo = false; clearInterval(temporizador); };
  }, [conMensajes, pathname]);

  const rutaMensajes = rol === 'profesional' ? '/profesional/mensajes' : '/mensajes';
  return (
    <div className="desplegable" ref={contenedor}>
      <button ref={boton} type="button" className="boton-icono notificaciones__boton" aria-expanded={abierto} aria-controls="panel-notificaciones"
        aria-label={noLeidos ? `Notificaciones: ${noLeidos} ${noLeidos === 1 ? 'mensaje sin leer' : 'mensajes sin leer'}` : 'Notificaciones'}
        onClick={() => setAbierto(!abierto)}>
        <Icono nombre="campana" tamano={22} />
        {noLeidos > 0 && <span className="notificaciones__contador" aria-hidden="true">{noLeidos > 9 ? '9+' : noLeidos}</span>}
      </button>
      {abierto && (
        <div id="panel-notificaciones" className="desplegable__panel notificaciones__panel">
          <p className="notificaciones__titulo">Notificaciones</p>
          {noLeidos > 0 ? (
            <Link to={rutaMensajes} className="notificaciones__aviso" onClick={() => setAbierto(false)}>
              <span className="notificaciones__aviso-icono"><Icono nombre="chat" tamano={20} /></span>
              <span>
                <strong>{noLeidos} {noLeidos === 1 ? 'mensaje nuevo' : 'mensajes nuevos'}</strong>
                {rol === 'profesional' ? 'De tus clientes, sobre sus reservas.' : 'De tus profesionales, sobre tus citas.'}
              </span>
              <Icono nombre="flecha" tamano={16} />
            </Link>
          ) : (
            <div className="notificaciones__vacio">
              <Icono nombre="campana" tamano={28} />
              <p><strong>No tienes notificaciones</strong>Te avisaremos aquí cuando haya novedades en tu cuenta.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

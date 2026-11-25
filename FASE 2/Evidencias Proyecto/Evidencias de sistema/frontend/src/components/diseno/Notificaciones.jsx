import { createPortal } from 'react-dom';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSesion } from '../../context/SesionContext.jsx';
import useAvisosMensajes from '../../services/useAvisosMensajes.js';
import Icono from '../Icono.jsx';
import useDesplegable from './useDesplegable.js';
import { posicionNotificaciones } from './posicionNotificaciones.js';



// Avisos de mensajes y verificaciones. Desde FS-HU-31 avisa los mensajes sin leer de los chats: se consulta al cargar, al cambiar
// de pantalla y cada minuto (si la pestaña está a la vista). Al administrador le avisa las verificaciones pendientes
// (11-11-2026).
export default function Notificaciones({ ubicacion = 'encabezado' }) {
  const panel = useRef(null);
  const { abierto, setAbierto, contenedor, boton } = useDesplegable(panel);
  const { sesion } = useSesion();

  const rol = sesion?.usuario.rol;
  const administrador = rol === 'administrador';
  const { total: noLeidos, cargando, error, reintentar } = useAvisosMensajes();

  const lateral = ubicacion === 'lateral';
  const [destino, setDestino] = useState(null);
  const [posicion, setPosicion] = useState(null);
  useEffect(() => { setDestino(lateral ? contenedor.current?.closest('.navegacion-lateral') || document.body : contenedor.current); }, [contenedor, lateral]);
  useLayoutEffect(() => {
    if (!abierto || !lateral || !destino) return undefined;
    const ubicar = () => {
      if (!boton.current || !panel.current) return;
      const nueva = posicionNotificaciones(boton.current.getBoundingClientRect(), panel.current.getBoundingClientRect(), { width: window.innerWidth, height: window.innerHeight });
      setPosicion((anterior) => anterior?.left === nueva.left && anterior?.top === nueva.top ? anterior : nueva);
    };
    ubicar();
    const observador = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(ubicar);
    if (boton.current) observador?.observe(boton.current);
    if (panel.current) observador?.observe(panel.current);
    window.addEventListener('resize', ubicar);
    window.addEventListener('scroll', ubicar, true);
    return () => {
      observador?.disconnect();
      window.removeEventListener('resize', ubicar);
      window.removeEventListener('scroll', ubicar, true);
    };
  }, [abierto, lateral, destino, boton]);
  const rutaMensajes = rol === 'profesional' ? '/profesional/mensajes' : '/mensajes';
  return (
    <div className={`desplegable${lateral ? ' notificaciones--lateral' : ''}`} ref={contenedor}>
      <button ref={boton} type="button" className={lateral ? 'menu-lateral__enlace notificaciones__boton' : 'boton-icono notificaciones__boton'} aria-expanded={abierto} aria-controls="panel-notificaciones"
        aria-label={!noLeidos ? 'Notificaciones' : administrador
          ? `Notificaciones: ${noLeidos} ${noLeidos === 1 ? 'verificación pendiente' : 'verificaciones pendientes'}`
          : `Notificaciones: ${noLeidos} ${noLeidos === 1 ? 'mensaje sin leer' : 'mensajes sin leer'}`}
        onClick={() => setAbierto(!abierto)}>
        <Icono nombre="campana" tamano={lateral ? 26 : 22} activo={abierto} />
        {lateral && <span className="menu-lateral__texto">Notificaciones</span>}
        {noLeidos > 0 && <span className="notificaciones__contador" aria-hidden="true">{noLeidos > 9 ? '9+' : noLeidos}</span>}
      </button>
      {abierto && destino && createPortal(
        <section ref={panel} id="panel-notificaciones" className={`desplegable__panel notificaciones__panel${lateral ? ' notificaciones__panel--lateral' : ''}`} aria-label="Panel de notificaciones" style={lateral ? { ...posicion, visibility: posicion ? 'visible' : 'hidden' } : undefined}>
          <button type="button" className="boton-icono notificaciones__cerrar" aria-label="Cerrar notificaciones" onClick={() => { setAbierto(false); boton.current?.focus(); }}><Icono nombre="cerrar" tamano={20} /></button>
          <p className="notificaciones__titulo">Notificaciones</p>
          {cargando ? <p role="status">Comprobando notificaciones…</p> : error ? <div><p role="alert">No pudimos comprobar tus notificaciones.</p><button type="button" className="boton-texto" onClick={reintentar}>Reintentar</button></div> : noLeidos > 0 && administrador ? (
            <Link to="/admin/verificaciones" className="notificaciones__aviso" onClick={() => setAbierto(false)}>
              <span className="notificaciones__aviso-icono"><Icono nombre="escudo" tamano={20} /></span>
              <span>
                <strong>{noLeidos} {noLeidos === 1 ? 'verificación pendiente' : 'verificaciones pendientes'}</strong>
                Profesionales que esperan la revisión de sus documentos.
              </span>
              <Icono nombre="flecha" tamano={16} />
            </Link>
          ) : noLeidos > 0 ? (
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
        </section>, destino,
      )}
    </div>
  );
}

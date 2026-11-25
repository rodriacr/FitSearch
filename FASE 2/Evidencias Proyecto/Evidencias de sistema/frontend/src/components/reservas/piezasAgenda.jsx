import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import Alerta from '../Alerta.jsx';
import Icono from '../Icono.jsx';
import { futura } from '../../services/agenda.js';

export function Avisos({ error, aviso, onReintentar }) {
  return (
    <>
      {error && (
        <p role="alert" className="agenda__error">
          {error}{' '}
          <button type="button" className="boton-texto" onClick={onReintentar}>
            Reintentar
          </button>
        </p>
      )}
      {aviso && <Alerta tipo="exito">{aviso}</Alerta>}
    </>
  );
}

// Pregunta de confirmación dentro de la misma tarjeta, junto a lo que se va a cambiar. Antes aparecía al final de
// la lista y, con varias citas, quedaba fuera de la pantalla. Recibe el foco al abrirse y Escape la cierra.
export function Confirmacion({ id, titulo, texto, accion, ocupado, onConfirmar, onVolver }) {
  const caja = useRef(null);
  useEffect(() => {
    caja.current?.focus();
  }, []);
  return (
    <div
      ref={caja}
      className="agenda__confirmacion"
      role="group"
      aria-labelledby={id}
      tabIndex={-1}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onVolver();
      }}
    >
      <h4 id={id}>{titulo}</h4>
      <p>{texto}</p>
      <div className="agenda__acciones">
        <button
          type="button"
          className="boton boton--principal boton--compacto"
          disabled={ocupado}
          onClick={onConfirmar}
        >
          {accion}
        </button>
        <button
          type="button"
          className="boton boton--secundario boton--compacto"
          disabled={ocupado}
          onClick={onVolver}
        >
          Volver
        </button>
      </div>
    </div>
  );
}

// Al cerrar la pregunta con "Volver" o Escape, el foco regresa al botón que la abrió: mientras la pregunta está
// abierta, las acciones de la tarjeta quedan ocultas (no desmontadas). Tras confirmar no se devuelve (la lista se recarga).
const MODALIDAD = { presencial: 'Presencial', online: 'Online' };

// Datos de la reserva que eligió el usuario al reservar (09-11-2026) y acceso a la conversación (FS-HU-31).
export function DetallesCita({ r, profesional, compacto }) {
  const datos = [MODALIDAD[r.modalidad], r.primeraVisita === true && 'Primera visita', r.estado === 'cancelada' && r.canceladaPor
    && `Cancelada por ${r.canceladaPor === 'profesional' ? (profesional ? 'ti' : 'el profesional') : profesional ? 'la persona' : 'ti'}`].filter(Boolean);
  const conversacion = profesional ? `/profesional/mensajes?reserva=${r.id}` : `/mensajes?reserva=${r.id}`;
  const pasadaConfirmada = !profesional && r.estado === 'confirmada' && !futura(r);
  return (
    <>
      {datos.length > 0 && <p className="agenda__datos">{datos.join(' · ')}</p>}
      {!compacto && (r.estado !== 'cancelada' || r.mensajesNoLeidos > 0) && (
        <p className="agenda__enlaces">
          <Link to={conversacion} className="agenda__enlace">
            <Icono nombre="chat" tamano={16} /> Mensajes
            {r.mensajesNoLeidos > 0 && <span className="agenda__no-leidos" aria-label={`${r.mensajesNoLeidos} sin leer`}>{r.mensajesNoLeidos}</span>}
          </Link>
          {/* Reseñas verificadas: después de una cita confirmada, la persona puede calificar al profesional. */}
          {pasadaConfirmada && (
            <Link to={`/profesionales/${r.profesional.id}#titulo-resenas`} className="agenda__enlace">
              <Icono nombre="estrella" tamano={16} /> Calificar
            </Link>
          )}
        </p>
      )}
    </>
  );
}

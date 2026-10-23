import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Alerta from '../Alerta.jsx';
import Icono from '../Icono.jsx';
import { solicitar } from '../../services/api.js';
import { crearIcs, descargarIcs, fechaHorario, fechaLarga, futura, minutosEntre, textoDuracion } from '../../services/agenda.js';
import { direccionDe, etiquetaModalidad, iniciales, primerNombre } from '../../services/formato.js';
import CalendarioMes from './CalendarioMes.jsx';
import useAgenda from './useAgenda.js';
import './ReservarHora.css';

function duracionDe(bloques) {
  const minutos = [...new Set(bloques.map((b) => minutosEntre(b.horaInicio, b.horaFin)))].sort((a, b) => a - b);
  if (!minutos.length) return '';
  return minutos.length === 1 ? textoDuracion(minutos[0]) : `${textoDuracion(minutos[0])} a ${textoDuracion(minutos.at(-1))}`;
}

function lugarDe(profesional) {
  const { modalidad, comuna } = profesional;
  const presencial = direccionDe(profesional) || comuna || 'Presencial';
  if (modalidad === 'online') return 'Atención online';
  return modalidad === 'ambas' ? `${presencial} u online` : presencial;
}

// Reserva de una hora desde la ficha del profesional (FS-HU-14, rediseño de la SC-20): calendario del mes con los días
// que tienen horas, lista de horas del día, "Confirmar" en la misma fila, mensaje obligatorio y solicitud enviada, que
// queda pendiente hasta que el profesional la confirme. El archivo .ics se genera en el navegador, sin servicios externos.
export default function ReservarHora({ profesional }) {
  const { id: profesionalId, nombre, especialidad, modalidad } = profesional;
  const [revision, setRevision] = useState(0);
  const { datos, error: errorCarga } = useAgenda(`/profesionales/${profesionalId}/disponibilidades`, revision);
  // Límite del PO: una reserva activa por usuario con cada profesional. Se avisa antes de elegir la hora.
  const { datos: misReservas } = useAgenda('/reservas', revision);
  const reservaActiva = misReservas?.reservas.find(
    (r) => r.profesional.id === Number(profesionalId) && r.estado !== 'cancelada' && futura(r),
  );
  const [mesElegido, setMesElegido] = useState(null);
  const [diaElegido, setDiaElegido] = useState(null);
  const [bloqueId, setBloqueId] = useState(null);
  const [paso, setPaso] = useState('elegir');
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [enviada, setEnviada] = useState(null);
  const campoMensaje = useRef(null);
  const tituloEnviada = useRef(null);

  // Días con horas libres (la API solo entrega horas futuras y sin reserva activa).
  const horarios = datos?.horarios || [];
  const porDia = new Map();
  for (const bloque of horarios) porDia.set(bloque.fecha, [...(porDia.get(bloque.fecha) || []), bloque]);
  const fechas = [...porDia.keys()].sort();
  const meses = [...new Set(fechas.map((fecha) => fecha.slice(0, 7)))];
  const mes = meses.includes(mesElegido) ? mesElegido : meses[0];
  const fechasDelMes = fechas.filter((fecha) => fecha.startsWith(mes));
  const dia = fechasDelMes.includes(diaElegido) ? diaElegido : fechasDelMes[0];
  const bloquesDelDia = porDia.get(dia) || [];
  const bloque = horarios.find((b) => b.id === bloqueId) || null;

  useEffect(() => {
    if (paso === 'mensaje') campoMensaje.current?.focus();
    if (paso === 'enviada') tituloEnviada.current?.focus();
  }, [paso]);

  const elegirDia = (fecha) => {
    setDiaElegido(fecha);
    setBloqueId(null);
  };
  const irAMes = (destino) => {
    setMesElegido(destino);
    setDiaElegido(null);
    setBloqueId(null);
  };
  async function enviar(evento) {
    evento.preventDefault();
    setOcupado(true);
    setError('');
    try {
      const { reserva } = await solicitar('/reservas', { metodo: 'POST', cuerpo: { disponibilidadId: bloque.id, mensaje } });
      setEnviada({ ...reserva, horario: reserva?.horario || bloque });
      setPaso('enviada');
      setMensaje('');
      setRevision((r) => r + 1);
    } catch (e) {
      setError(e.message);
      if (e.estado === 409 && e.detalles?.motivo !== 'limite_por_profesional') {
        // Otra persona tomó la hora: se vuelve a elegir con las horas actualizadas, conservando el mensaje.
        setBloqueId(null);
        setPaso('elegir');
      }
      if (e.estado === 409) setRevision((r) => r + 1);
    } finally {
      setOcupado(false);
    }
  }

  const agregarAlCalendario = () => {
    const { horario } = enviada;
    descargarIcs(crearIcs({ id: enviada.id, horario, profesional, lugar: lugarDe(profesional) }), `cita-fitsearch-${horario.fecha}.ics`);
  };

  let contenido;
  if (paso === 'enviada') {
    const { horario } = enviada;
    contenido = (
      <div className="reserva-enviada">
        <span className="reserva-enviada__check"><Icono nombre="check" tamano={34} /></span>
        <h3 ref={tituloEnviada} tabIndex={-1}>Solicitud enviada</h3>
        <p className="reserva-enviada__cuando">
          <span className="reserva-enviada__fecha">{fechaLarga(horario.fecha)}</span> · {horario.horaInicio} – {horario.horaFin}
        </p>
        <span className="reserva-enviada__estado">Pendiente de confirmación</span>
        <p className="reserva-enviada__texto">
          {primerNombre(nombre)} revisará tu solicitud. Verás si la confirma en Mis citas.
        </p>
        <div className="reserva-enviada__acciones">
          <button type="button" className="boton boton--secundario boton--compacto" onClick={agregarAlCalendario}>
            <Icono nombre="descargar" tamano={18} /> Agregar al calendario
          </button>
          <Link to="/citas" className="boton boton--principal boton--compacto">Ver mis citas</Link>
        </div>
        <p className="reserva-enviada__nota">El archivo .ics se abre con Google Calendar, Outlook o el calendario del celular.</p>
      </div>
    );
  } else if (!datos && !errorCarga) {
    contenido = <p className="texto-secundario" role="status">Cargando horarios…</p>;
  } else if (errorCarga) {
    contenido = (
      <div>
        <Alerta>{errorCarga}</Alerta>
        <button type="button" className="boton boton--secundario boton--compacto" onClick={() => setRevision((r) => r + 1)}>Reintentar</button>
      </div>
    );
  } else if (reservaActiva) {
    contenido = (
      <p className="agenda__vacio" role="status">
        Ya tienes una reserva {reservaActiva.estado} con este profesional para el {fechaHorario(reservaActiva.horario)}. Para pedir
        otra hora, primero cancélala en <Link to="/citas">Mis citas</Link>.
      </p>
    );
  } else if (!fechas.length) {
    contenido = <p className="texto-secundario">Este profesional no tiene horarios disponibles por ahora.</p>;
  } else {
    const anterior = meses.findLast((m) => m < mes);
    const siguiente = meses.find((m) => m > mes);
    contenido = (
      <div className="reserva">
        <aside className="reserva__resumen" aria-label="Resumen de la reserva">
          <span className="avatar avatar--grande" aria-hidden="true">{iniciales(nombre)}</span>
          <p className="reserva__profesional"><strong>{nombre}</strong><span>{especialidad}</span></p>
          <ul className="reserva__datos">
            <li><Icono nombre="reloj" tamano={18} /> {duracionDe(bloque ? [bloque] : bloquesDelDia)}</li>
            <li><Icono nombre={modalidad === 'presencial' ? 'pin' : 'video'} tamano={18} /> {etiquetaModalidad(modalidad)}</li>
            <li><Icono nombre="globo" tamano={18} /> Hora de Chile (Santiago)</li>
            {bloque && (
              <li className="reserva__datos-elegido">
                <Icono nombre="calendario" tamano={18} /> {fechaLarga(bloque.fecha)}, {bloque.horaInicio} – {bloque.horaFin}
              </li>
            )}
          </ul>
          <p className="reserva__nota">Tu solicitud queda pendiente hasta que {primerNombre(nombre)} la confirme.</p>
        </aside>

        {paso === 'mensaje' && bloque ? (
          <form className="reserva__mensaje" onSubmit={enviar}>
            <button type="button" className="boton-texto reserva__cambiar" onClick={() => { setError(''); setPaso('elegir'); }}>
              <Icono nombre="flechaIzquierda" tamano={16} /> Cambiar hora
            </button>
            <h3>Cuéntale qué necesitas</h3>
            <p className="texto-secundario">{fechaLarga(bloque.fecha)}, {bloque.horaInicio} – {bloque.horaFin}</p>
            <label className="campo">
              <span className="campo__etiqueta">Qué necesitas consultar</span>
              <textarea ref={campoMensaje} className="campo__control campo__control--area" required minLength={10} maxLength={500}
                value={mensaje} onChange={(e) => setMensaje(e.target.value)} disabled={ocupado} aria-describedby="ayuda-mensaje-reserva" />
            </label>
            <p id="ayuda-mensaje-reserva" className="campo__ayuda">
              Entre 10 y 500 caracteres ({mensaje.length}/500). El mensaje solo lo verán tú y el profesional.
            </p>
            <button className="boton boton--principal" disabled={ocupado}>
              {ocupado ? 'Enviando…' : 'Enviar solicitud de reserva'}
            </button>
          </form>
        ) : (
          <>
            <div className="reserva__calendario">
              <p className="reserva__titulo">Elige día y hora</p>
              <CalendarioMes id={`mes-reserva-${profesionalId}`} mes={mes} dia={dia} onElegir={elegirDia} onMes={irAMes}
                anterior={anterior} siguiente={siguiente} etiquetaAnterior="Mes anterior con horas" etiquetaSiguiente="Mes siguiente con horas"
                describirDia={(fecha) => {
                  const cantidad = porDia.get(fecha)?.length || 0;
                  return {
                    habilitado: cantidad > 0, marcado: cantidad > 0,
                    etiqueta: `${fechaLarga(fecha)}, ${cantidad ? `${cantidad} ${cantidad === 1 ? 'hora disponible' : 'horas disponibles'}` : 'sin horas disponibles'}`,
                  };
                }} />
            </div>

            <div className="reserva__horas">
              <h3 className="reserva__dia-titulo">{fechaLarga(dia)}</h3>
              <p className="texto-secundario">{bloquesDelDia.length} {bloquesDelDia.length === 1 ? 'hora disponible' : 'horas disponibles'}</p>
              <ul className="reserva__lista" aria-label={`Horas del ${fechaLarga(dia)}`}>
                {bloquesDelDia.map((b) => {
                  const elegido = b.id === bloqueId;
                  return (
                    <li key={b.id} className={`reserva__hora${elegido ? ' reserva__hora--elegida' : ''}`}>
                      <button type="button" className="reserva__hora-boton" aria-pressed={elegido} aria-label={`${b.horaInicio} a ${b.horaFin}`}
                        onClick={() => setBloqueId(elegido ? null : b.id)}>
                        {b.horaInicio}
                      </button>
                      {elegido && (
                        <button type="button" className="reserva__confirmar" aria-label={`Confirmar ${b.horaInicio} a ${b.horaFin}`}
                          onClick={() => { setError(''); setPaso('mensaje'); }}>
                          Confirmar
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <section className="ficha__seccion reservar" aria-labelledby="titulo-reservar">
      <h2 id="titulo-reservar">Reservar una hora</h2>
      {error && <Alerta>{error}</Alerta>}
      {contenido}
    </section>
  );
}

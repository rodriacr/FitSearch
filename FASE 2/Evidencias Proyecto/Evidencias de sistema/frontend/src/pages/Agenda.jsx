import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { solicitar } from '../services/api.js';
import { useSesion } from '../context/SesionContext.jsx';
import Icono from '../components/Icono.jsx';
import './Agenda.css';

const fechaHorario = (h) =>
  `${new Intl.DateTimeFormat('es-CL', { dateStyle: 'full', timeZone: 'UTC' }).format(new Date(`${h.fecha}T12:00:00Z`))}, ${h.horaInicio}–${h.horaFin}`;
const futura = (r) =>
  `${r.horario.fecha}T${r.horario.horaInicio}` >
  new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'America/Santiago',
    dateStyle: 'short',
    timeStyle: 'short',
    hourCycle: 'h23',
  })
    .format(new Date())
    .replace(' ', 'T');
function useAgenda(ruta, revision) {
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let vigente = true;
    solicitar(ruta)
      .then((d) => {
        if (vigente) {
          setDatos(d);
          setError('');
        }
      })
      .catch((e) => {
        if (vigente) setError(e.message);
      });
    return () => {
      vigente = false;
    };
  }, [ruta, revision]);
  return { datos, error };
}
function Avisos({ error, aviso, onReintentar }) {
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
      {aviso && <p role="status">{aviso}</p>}
    </>
  );
}

// Pregunta de confirmación dentro de la misma tarjeta, junto a lo que se va a cambiar. Antes aparecía al final de
// la lista y, con varias citas, quedaba fuera de la pantalla. Recibe el foco al abrirse y Escape la cierra.
function Confirmacion({ id, titulo, texto, accion, ocupado, onConfirmar, onVolver }) {
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
function useVolverFoco(abierta) {
  const disparador = useRef(null);
  useEffect(() => {
    if (abierta || !disparador.current) return;
    if (disparador.current.isConnected) disparador.current.focus();
    disparador.current = null;
  }, [abierta]);
  return {
    recordar: (boton) => {
      disparador.current = boton;
    },
    olvidar: () => {
      disparador.current = null;
    },
  };
}

export function MisCitas({ compacto = false }) {
  const { sesion } = useSesion();
  const profesional = sesion.usuario.rol === 'profesional';
  const [revision, setRevision] = useState(0);
  const { datos, error: errorCarga } = useAgenda('/reservas', revision);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [confirmacion, setConfirmacion] = useState(null);
  const foco = useVolverFoco(confirmacion);
  const [ocupado, setOcupado] = useState(false);
  const [filtro, setFiltro] = useState('proximas');
  const preguntar = (e, id, estado) => {
    foco.recordar(e.currentTarget);
    setConfirmacion({ id, estado });
  };
  async function decidir() {
    setOcupado(true);
    setError('');
    try {
      await solicitar(`/reservas/${confirmacion.id}`, {
        metodo: 'PATCH',
        cuerpo: { estado: confirmacion.estado },
      });
      setAviso(
        confirmacion.estado === 'cancelada'
          ? 'Reserva cancelada. El horario vuelve a estar disponible.'
          : 'Reserva confirmada.',
      );
      foco.olvidar();
      setConfirmacion(null);
      setRevision((r) => r + 1);
    } catch (e) {
      setError(e.message);
    } finally {
      setOcupado(false);
    }
  }
  const visibles =
    datos?.reservas.filter(
      (r) => filtro === 'historial' || (r.estado !== 'cancelada' && futura(r)),
    ) || [];
  return (
    <section
      className="agenda"
      aria-label={compacto ? 'Próximas citas' : 'Mis citas'}
    >
      <div className="agenda__cabecera">
        <h2>
          <Icono nombre="calendario" />
          {compacto
            ? 'Próximas citas'
            : profesional
              ? 'Reservas recibidas'
              : 'Mis citas'}
        </h2>
        {compacto && <Link to="/citas">Ver todas</Link>}
      </div>
      <p className="texto-secundario">Horarios en hora de Chile (Santiago).</p>
      {!compacto && (
        <div className="agenda__filtros">
          {[
            ['proximas', 'Próximas'],
            ['historial', 'Todas e historial'],
          ].map(([v, n]) => (
            <button
              type="button"
              className="boton boton--secundario boton--compacto"
              key={v}
              aria-pressed={filtro === v}
              onClick={() => setFiltro(v)}
            >
              {n}
            </button>
          ))}
        </div>
      )}
      <Avisos
        error={error || errorCarga}
        aviso={aviso}
        onReintentar={() => {
          setError('');
          setRevision((r) => r + 1);
        }}
      />
      {!datos && !errorCarga && <p role="status">Cargando citas…</p>}
      {datos && !visibles.length && (
        <div className="agenda__vacio">
          <h3>Aún no tienes citas agendadas</h3>
          <p>
            {profesional
              ? 'Las solicitudes de tus horarios publicados aparecerán aquí.'
              : 'Cuando reserves una hora con un profesional, la verás aquí.'}
          </p>
          {!profesional && (
            <Link
              to="/profesionales"
              className="boton boton--secundario boton--compacto"
            >
              Buscar profesionales
            </Link>
          )}
        </div>
      )}
      <div className="agenda__lista">
        {(compacto ? visibles.slice(0, 3) : visibles).map((r) => (
          <article key={r.id} className="agenda__tarjeta">
            <div>
              <span className={`agenda__estado agenda__estado--${r.estado}`}>
                {r.estado}
              </span>
              <h3>{profesional ? r.usuario.nombre : r.profesional.nombre}</h3>
              <p>
                <strong>{fechaHorario(r.horario)}</strong>
              </p>
              <p className="agenda__mensaje">{r.mensaje}</p>
            </div>
            {!compacto && r.estado !== 'cancelada' && futura(r) && (
              <div
                className="agenda__acciones"
                hidden={confirmacion?.id === r.id}
              >
                {profesional && r.estado === 'pendiente' && (
                  <button
                    type="button"
                    className="boton boton--principal boton--compacto"
                    disabled={ocupado}
                    onClick={(e) => preguntar(e, r.id, 'confirmada')}
                  >
                    Confirmar reserva
                  </button>
                )}
                <button
                  type="button"
                  className="boton boton--secundario boton--compacto"
                  disabled={ocupado}
                  onClick={(e) => preguntar(e, r.id, 'cancelada')}
                >
                  Cancelar reserva
                </button>
              </div>
            )}
            {confirmacion?.id === r.id && (
              <Confirmacion
                id={`confirmar-reserva-${r.id}`}
                titulo={`¿${confirmacion.estado === 'cancelada' ? 'Cancelar' : 'Confirmar'} esta reserva?`}
                texto={
                  confirmacion.estado === 'cancelada'
                    ? 'Si cancelas, tendrás que reservar nuevamente para recuperar una hora.'
                    : 'La solicitud quedará confirmada en ambas agendas.'
                }
                accion="Confirmar cambio"
                ocupado={ocupado}
                onConfirmar={decidir}
                onVolver={() => setConfirmacion(null)}
              />
            )}
          </article>
        ))}
      </div>
    </section>
  );
}

export function HorariosProfesional() {
  const [revision, setRevision] = useState(0);
  const { datos, error: errorCarga } = useAgenda('/disponibilidades', revision);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [editando, setEditando] = useState(null);
  const [borrando, setBorrando] = useState(null);
  const foco = useVolverFoco(borrando);
  const [ocupado, setOcupado] = useState(false);
  const [campos, setCampos] = useState({
    fecha: '',
    horaInicio: '',
    horaFin: '',
  });
  async function guardar(e) {
    e.preventDefault();
    setOcupado(true);
    setError('');
    setAviso('');
    try {
      await solicitar(`/disponibilidades${editando ? `/${editando}` : ''}`, {
        metodo: editando ? 'PUT' : 'POST',
        cuerpo: campos,
      });
      setAviso(editando ? 'Horario actualizado.' : 'Horario publicado.');
      setCampos({ fecha: '', horaInicio: '', horaFin: '' });
      setEditando(null);
      setRevision((r) => r + 1);
    } catch (e) {
      setError(e.message);
    } finally {
      setOcupado(false);
    }
  }
  async function borrar() {
    setOcupado(true);
    setError('');
    try {
      const resultado = await solicitar(`/disponibilidades/${borrando}`, { metodo: 'DELETE' });
      if (editando === borrando) {
        setEditando(null);
        setCampos({ fecha: '', horaInicio: '', horaFin: '' });
      }
      foco.olvidar();
      setBorrando(null);
      setAviso(resultado.retirado
        ? 'Horario retirado. Ya no admite nuevas reservas; su historial se conserva.'
        : 'Horario eliminado.');
      setRevision((r) => r + 1);
    } catch (e) {
      setError(e.message);
    } finally {
      setOcupado(false);
    }
  }
  return (
    <section className="agenda">
      <div className="agenda__cabecera">
        <h2>
          <Icono nombre="calendario" />
          Mis horarios disponibles
        </h2>
      </div>
      <p>
        Publica bloques concretos para que puedan reservar contigo. Horarios en
        hora de Chile (Santiago).
      </p>
      <Avisos
        error={error || errorCarga}
        aviso={aviso}
        onReintentar={() => {
          setError('');
          setRevision((r) => r + 1);
        }}
      />
      <form className="agenda__formulario" onSubmit={guardar}>
        <h3>{editando ? 'Editar horario' : 'Publicar un horario'}</h3>
        <div className="agenda__campos">
          {[
            ['fecha', 'Fecha', 'date'],
            ['horaInicio', 'Hora de inicio', 'time'],
            ['horaFin', 'Hora de término', 'time'],
          ].map(([clave, texto, tipo]) => (
            <label key={clave}>
              {texto}
              <input
                className="campo__control"
                required
                type={tipo}
                value={campos[clave]}
                disabled={ocupado}
                onChange={(e) =>
                  setCampos({ ...campos, [clave]: e.target.value })
                }
              />
            </label>
          ))}
        </div>
        <button className="boton boton--principal" disabled={ocupado}>
          {ocupado
            ? 'Guardando…'
            : editando
              ? 'Guardar horario'
              : 'Publicar horario'}
        </button>
        {editando && (
          <button
            type="button"
            className="boton boton--secundario"
            onClick={() => {
              setEditando(null);
              setCampos({ fecha: '', horaInicio: '', horaFin: '' });
            }}
          >
            Cancelar edición
          </button>
        )}
      </form>
      {!datos && !errorCarga && <p role="status">Cargando horarios…</p>}
      {datos && !datos.horarios.length && (
        <p>Aún no has publicado horarios disponibles.</p>
      )}
      <div className="agenda__lista">
        {datos?.horarios.map((b) => (
          <article className="agenda__tarjeta" key={b.id}>
            <div>
              <span className="agenda__estado">
                {b.ocupado ? 'Reservado' : 'Disponible'}
              </span>
              <h3>{fechaHorario(b)}</h3>
            </div>
            <div className="agenda__acciones" hidden={borrando === b.id}>
              <button
                type="button"
                className="boton boton--secundario boton--compacto"
                disabled={b.ocupado || b.conHistorial || ocupado}
                onClick={() => {
                  setEditando(b.id);
                  setCampos({
                    fecha: b.fecha,
                    horaInicio: b.horaInicio,
                    horaFin: b.horaFin,
                  });
                }}
              >
                Editar horario
              </button>
              <button
                type="button"
                className="boton boton--secundario boton--compacto"
                disabled={b.ocupado || ocupado}
                onClick={(e) => {
                  foco.recordar(e.currentTarget);
                  setBorrando(b.id);
                }}
              >
                Retirar horario
              </button>
            </div>
            {borrando === b.id && (
              <Confirmacion
                id={`retirar-horario-${b.id}`}
                titulo="¿Retirar este horario?"
                texto="El bloque dejará de aparecer para nuevas reservas. Los bloques con historial se conservan."
                accion="Confirmar retiro"
                ocupado={ocupado}
                onConfirmar={borrar}
                onVolver={() => setBorrando(null)}
              />
            )}
          </article>
        ))}
      </div>
    </section>
  );
}

export function ReservarHora({ profesionalId }) {
  const [revision, setRevision] = useState(0);
  const { datos, error: errorCarga } = useAgenda(
    `/profesionales/${profesionalId}/disponibilidades`,
    revision,
  );
  // Límite del PO: una reserva activa por usuario con cada profesional. Se avisa antes de escribir el mensaje.
  const { datos: misReservas } = useAgenda('/reservas', revision);
  const reservaActiva = misReservas?.reservas.find(
    (r) =>
      r.profesional.id === Number(profesionalId) &&
      r.estado !== 'cancelada' &&
      futura(r),
  );
  const [error, setError] = useState('');
  const [bloque, setBloque] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState('');
  async function enviar(e) {
    e.preventDefault();
    setOcupado(true);
    setError('');
    try {
      await solicitar('/reservas', {
        metodo: 'POST',
        cuerpo: { disponibilidadId: Number(bloque), mensaje },
      });
      setAviso(
        'Solicitud de reserva enviada. El profesional podrá confirmarla.',
      );
      setBloque('');
      setMensaje('');
      setRevision((r) => r + 1);
    } catch (e) {
      setError(e.message);
      if (e.estado === 409 && e.detalles?.motivo === 'limite_por_profesional') {
        // El horario sigue libre: se conserva la selección y se recarga para mostrar la reserva activa.
        setRevision((r) => r + 1);
      } else if (e.estado === 409) {
        setBloque('');
        setRevision((r) => r + 1);
      }
    } finally {
      setOcupado(false);
    }
  }
  return (
    <section className="agenda ficha__seccion">
      <h2>Reservar una hora</h2>
      <p>
        Elige un horario y cuéntale brevemente al profesional qué necesitas.
        Hora de Chile (Santiago).
      </p>
      <Avisos
        error={error || errorCarga}
        aviso={aviso}
        onReintentar={() => {
          setError('');
          setRevision((r) => r + 1);
        }}
      />
      {aviso && <Link to="/citas">Ver mis citas</Link>}
      {reservaActiva && !aviso && (
        <p className="agenda__vacio" role="status">
          Ya tienes una reserva {reservaActiva.estado} con este profesional para
          el {fechaHorario(reservaActiva.horario)}. Para pedir otra hora,
          primero cancélala en <Link to="/citas">Mis citas</Link>.
        </p>
      )}
      {!datos && !errorCarga && <p role="status">Cargando horarios…</p>}
      {datos && !datos.horarios.length && (
        <p>Este profesional no tiene horarios disponibles por ahora.</p>
      )}
      {datos?.horarios.length > 0 && !reservaActiva && (
        <form className="agenda__formulario" onSubmit={enviar}>
          <label>
            Horario disponible
            <select
              className="campo__control"
              required
              value={bloque}
              onChange={(e) => setBloque(e.target.value)}
              disabled={ocupado}
            >
              <option value="">Selecciona una hora</option>
              {datos.horarios.map((b) => (
                <option key={b.id} value={b.id}>
                  {fechaHorario(b)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Qué necesitas consultar
            <textarea
              className="campo__control"
              required
              minLength={10}
              maxLength={500}
              value={mensaje}
              onChange={(e) => setMensaje(e.target.value)}
              disabled={ocupado}
            />
          </label>
          <p className="texto-secundario">
            Entre 10 y 500 caracteres. El mensaje solo lo verán tú y el
            profesional.
          </p>
          <button className="boton boton--principal" disabled={ocupado}>
            {ocupado ? 'Enviando…' : 'Enviar solicitud de reserva'}
          </button>
        </form>
      )}
    </section>
  );
}
export default function AgendaProfesional() {
  return (
    <div>
      <h1>Mi agenda</h1>
      <HorariosProfesional />
      <MisCitas />
    </div>
  );
}

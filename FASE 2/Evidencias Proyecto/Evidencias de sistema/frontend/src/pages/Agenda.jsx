import { useEffect, useState } from 'react';
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

export function MisCitas({ compacto = false }) {
  const { sesion } = useSesion();
  const profesional = sesion.usuario.rol === 'profesional';
  const [revision, setRevision] = useState(0);
  const { datos, error: errorCarga } = useAgenda('/reservas', revision);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [confirmacion, setConfirmacion] = useState(null);
  const [ocupado, setOcupado] = useState(false);
  const [filtro, setFiltro] = useState('proximas');
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
              <div className="agenda__acciones">
                {profesional && r.estado === 'pendiente' && (
                  <button
                    type="button"
                    className="boton boton--primario boton--compacto"
                    disabled={ocupado}
                    onClick={() =>
                      setConfirmacion({ id: r.id, estado: 'confirmada' })
                    }
                  >
                    Confirmar reserva
                  </button>
                )}
                <button
                  type="button"
                  className="boton boton--secundario boton--compacto"
                  disabled={ocupado}
                  onClick={() =>
                    setConfirmacion({ id: r.id, estado: 'cancelada' })
                  }
                >
                  Cancelar reserva
                </button>
              </div>
            )}
          </article>
        ))}
      </div>
      {confirmacion && (
        <div
          className="agenda__confirmacion"
          role="dialog"
          aria-labelledby="confirmar-reserva"
        >
          <h3 id="confirmar-reserva">
            ¿{confirmacion.estado === 'cancelada' ? 'Cancelar' : 'Confirmar'}{' '}
            esta reserva?
          </h3>
          <p>
            {confirmacion.estado === 'cancelada'
              ? 'Si cancelas, tendrás que reservar nuevamente para recuperar una hora.'
              : 'La solicitud quedará confirmada en ambas agendas.'}
          </p>
          <button
            className="boton boton--primario boton--compacto"
            disabled={ocupado}
            onClick={decidir}
          >
            Confirmar cambio
          </button>
          <button
            className="boton boton--secundario boton--compacto"
            disabled={ocupado}
            onClick={() => setConfirmacion(null)}
          >
            Volver
          </button>
        </div>
      )}
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
        <button className="boton boton--primario" disabled={ocupado}>
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
            <div className="agenda__acciones">
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
                onClick={() => setBorrando(b.id)}
              >
                Retirar horario
              </button>
            </div>
          </article>
        ))}
      </div>
      {borrando && (
        <div
          className="agenda__confirmacion"
          role="dialog"
          aria-labelledby="eliminar-horario"
        >
          <h3 id="eliminar-horario">¿Retirar este horario?</h3>
          <p>
            El bloque dejará de aparecer para nuevas reservas. Los bloques con
            historial se conservan.
          </p>
          <button
            className="boton boton--primario"
            disabled={ocupado}
            onClick={borrar}
          >
            Confirmar retiro
          </button>
          <button
            className="boton boton--secundario"
            disabled={ocupado}
            onClick={() => setBorrando(null)}
          >
            Volver
          </button>
        </div>
      )}
    </section>
  );
}

export function ReservarHora({ profesionalId }) {
  const [revision, setRevision] = useState(0);
  const { datos, error: errorCarga } = useAgenda(
    `/profesionales/${profesionalId}/disponibilidades`,
    revision,
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
      if (e.estado === 409) {
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
      {!datos && !errorCarga && <p role="status">Cargando horarios…</p>}
      {datos && !datos.horarios.length && (
        <p>Este profesional no tiene horarios disponibles por ahora.</p>
      )}
      {datos?.horarios.length > 0 && (
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
          <button className="boton boton--primario" disabled={ocupado}>
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

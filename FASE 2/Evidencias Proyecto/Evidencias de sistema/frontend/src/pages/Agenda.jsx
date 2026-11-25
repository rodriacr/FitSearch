import { Avisos, Confirmacion, DetallesCita } from '../components/reservas/piezasAgenda.jsx';
import useVolverFoco from '../components/reservas/useVolverFoco.js';
import ListadoReservas from './ListadoReservas.jsx';
import { esProxima } from '../services/reservas.js';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { solicitar } from '../services/api.js';
import { ahoraChile, fechaHorario, fechaLarga, minutosEntre, moverMes, sumarMinutos, textoDuracion } from '../services/agenda.js';
import { useSesion } from '../context/SesionContext.jsx';
import Icono from '../components/Icono.jsx';
import CalendarioMes from '../components/reservas/CalendarioMes.jsx';
import { ESTADOS } from '../components/agenda/semana.js';
import useAgenda from '../components/reservas/useAgenda.js';
import './Agenda.css';

export function MisCitas({ compacto = false, onCambio }) {
  const { sesion } = useSesion();
  const profesional = sesion.usuario.rol === 'profesional';
  return compacto ? <ProximasCitas compactoProfesional={profesional} /> : (
    <ListadoReservas profesional={profesional} onCambio={onCambio} />
  );
}

function ProximasCitas({ compactoProfesional }) {
  const [revision, setRevision] = useState(0);
  const [ahora, setAhora] = useState(ahoraChile);
  const { datos, error, cargando } = useAgenda('/reservas', revision);
  useEffect(() => {
    const reloj = setInterval(() => setAhora(ahoraChile()), 60000);
    return () => clearInterval(reloj);
  }, []);
  const proximas = (datos?.reservas ?? []).filter((r) => esProxima(r, ahora)).slice(0, 3);
  return (
    <section className="agenda agenda--compacta" aria-label="Próximas citas">
      <div className="agenda__cabecera">
        <h2><Icono nombre="calendario" />Próximas citas</h2>
        <Link to="/citas">Ver todas</Link>
      </div>
      <p className="texto-secundario">Horarios en hora de Chile (Santiago).</p>
      <Avisos error={error} onReintentar={() => setRevision((r) => r + 1)} />
      {cargando && <p role="status">Cargando citas…</p>}
      {datos && !error && !cargando && proximas.length === 0 && (
        <div className="agenda__vacio">
          <h3>Aún no tienes citas agendadas</h3>
          <p>Cuando reserves una hora con un profesional, la verás aquí.</p>
          <Link to="/profesionales" className="boton boton--secundario boton--compacto">Buscar profesionales</Link>
        </div>
      )}
      <div className="agenda__lista">
        {proximas.map((r) => (
          <article key={r.id} className="agenda__tarjeta">
            <div>
              <span className={'agenda__estado agenda__estado--' + r.estado}>{ESTADOS[r.estado]}</span>
              <h3>{compactoProfesional ? r.usuario.nombre : r.profesional.nombre}</h3>
              <p><strong>{fechaHorario(r.horario)}</strong></p>
              {r.mensaje && <p className="agenda__mensaje">{r.mensaje}</p>}
              <DetallesCita r={r} profesional={compactoProfesional} compacto />
            </div>
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
  // Calendario del formulario (SC-21): empieza en el mes actual y no deja elegir días pasados.
  const hoy = ahoraChile().slice(0, 10);
  const [mes, setMes] = useState(hoy.slice(0, 7));
  const formulario = useRef(null);
  const campoInicio = useRef(null);
  const porDia = new Map();
  for (const b of datos?.horarios || []) porDia.set(b.fecha, [...(porDia.get(b.fecha) || []), b]);
  const delDia = (porDia.get(campos.fecha) || []).filter((b) => b.id !== editando);
  const duracion = campos.horaInicio && campos.horaFin ? minutosEntre(campos.horaInicio, campos.horaFin) : null;
  // Al editar un horario de la lista, el formulario queda a la vista con el calendario en su mes y el foco en la hora.
  useEffect(() => {
    if (!editando) return;
    const suave = !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    formulario.current?.scrollIntoView?.({ behavior: suave ? 'smooth' : 'auto', block: 'start' });
    campoInicio.current?.focus({ preventScroll: true });
  }, [editando]);
  async function guardar(e) {
    e.preventDefault();
    setError('');
    setAviso('');
    if (campos.horaFin <= campos.horaInicio) {
      setError('La hora de término debe ser posterior a la hora de inicio.');
      return;
    }
    setOcupado(true);
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
    setAviso('');
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
      <form ref={formulario} className="agenda__formulario agenda__publicar" onSubmit={guardar}>
        <h3>{editando ? 'Editar horario' : 'Publicar un horario'}</h3>
        <div className="publicar">
          <CalendarioMes id="mes-publicar" mes={mes} dia={campos.fecha} onMes={setMes}
            onElegir={(fecha) => setCampos({ ...campos, fecha })}
            anterior={mes > hoy.slice(0, 7) ? moverMes(mes, -1) : undefined} siguiente={moverMes(mes, 1)}
            describirDia={(fecha) => {
              const cantidad = porDia.get(fecha)?.length || 0;
              const detalle = fecha < hoy ? 'día pasado'
                : cantidad ? `${cantidad} ${cantidad === 1 ? 'horario publicado' : 'horarios publicados'}` : 'sin horarios publicados';
              return { habilitado: fecha >= hoy, marcado: cantidad > 0, etiqueta: `${fechaLarga(fecha)}, ${detalle}` };
            }} />
          <div className="publicar__horas">
            <p className="publicar__dia" aria-live="polite">
              {campos.fecha ? fechaLarga(campos.fecha) : 'Elige un día en el calendario'}
            </p>
            {delDia.length > 0 && (
              <p className="publicar__existentes">
                Ya publicaste: {delDia.map((b) => `${b.horaInicio}–${b.horaFin}`).join(', ')}
              </p>
            )}
            <div className="publicar__campos">
              {[
                ['horaInicio', 'Hora de inicio', campoInicio],
                ['horaFin', 'Hora de término', null],
              ].map(([clave, texto, ref]) => (
                <label key={clave}>
                  {texto}
                  <input
                    ref={ref}
                    className="campo__control"
                    required
                    type="time"
                    step="900"
                    value={campos[clave]}
                    disabled={ocupado}
                    onChange={(e) =>
                      setCampos({ ...campos, [clave]: e.target.value })
                    }
                  />
                </label>
              ))}
            </div>
            <div className="publicar__duraciones" role="group" aria-label="Duración del bloque">
              {[30, 45, 60, 90].map((minutos) => {
                const fin = campos.horaInicio && sumarMinutos(campos.horaInicio, minutos);
                return (
                  <button key={minutos} type="button" className="chip" aria-pressed={duracion === minutos}
                    disabled={!fin || ocupado} onClick={() => setCampos({ ...campos, horaFin: fin })}>
                    {textoDuracion(minutos)}
                  </button>
                );
              })}
            </div>
            <button className="boton boton--principal" disabled={ocupado || !campos.fecha}>
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
          </div>
        </div>
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
                  setMes(b.fecha.slice(0, 7));
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

export default function AgendaProfesional() {
  return (
    <div>
      <h1>Mi agenda</h1>
      <HorariosProfesional />
      <MisCitas />
    </div>
  );
}

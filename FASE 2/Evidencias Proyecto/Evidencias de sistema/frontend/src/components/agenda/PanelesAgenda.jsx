import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import reglas from '@shared/reglas.json';
import Alerta from '../Alerta.jsx';
import Icono from '../Icono.jsx';
import { solicitar } from '../../services/api.js';
import { textoDuracion } from '../../services/agenda.js';
import { aHora, aMinutos, bloquesPrevistos, diaCorto, diaLargo, ESTADOS, sumarDias } from './semana.js';
import './PanelesAgenda.css';

const { duraciones, serie, bloqueo: reglasBloqueo } = reglas.agenda;

// Marco común de los paneles del costado: título, botón para cerrar y foco al abrirse.
function Panel({ titulo, onCerrar, children, id }) {
  const encabezado = useRef(null);
  useEffect(() => { encabezado.current?.focus({ preventScroll: true }); }, [id]);
  return (
    <section className="panel-agenda" aria-labelledby={`${id}-titulo`} onKeyDown={(e) => { if (e.key === 'Escape' && onCerrar) onCerrar(); }}>
      <header className="panel-agenda__cabecera">
        <h2 id={`${id}-titulo`} ref={encabezado} tabIndex={-1}>{titulo}</h2>
        {onCerrar && (
          <button type="button" className="boton-icono panel-agenda__cerrar" aria-label="Cerrar panel" onClick={onCerrar}>
            <Icono nombre="cerrar" tamano={20} />
          </button>
        )}
      </header>
      {children}
    </section>
  );
}

// Pregunta en dos pasos para lo que no se puede deshacer (cancelar una reserva, retirar un horario).
function Confirmar({ pregunta, accion, onConfirmar, onVolver, ocupado }) {
  const caja = useRef(null);
  useEffect(() => { caja.current?.focus(); }, []);
  return (
    <div ref={caja} className="panel-agenda__confirmar" role="group" aria-label={pregunta} tabIndex={-1}>
      <p>{pregunta}</p>
      <div className="panel-agenda__acciones">
        <button type="button" className="boton boton--principal boton--compacto" disabled={ocupado} onClick={onConfirmar}>{accion}</button>
        <button type="button" className="boton boton--secundario boton--compacto" disabled={ocupado} onClick={onVolver}>Volver</button>
      </div>
    </div>
  );
}

const modalidadTexto = { presencial: 'Presencial', online: 'Online' };

// Detalle del horario elegido en el calendario: quién reservó, su mensaje y las acciones posibles.
export function DetalleHorario({ horario, onCambio, onCerrar }) {
  const [pregunta, setPregunta] = useState(null);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState('');
  const { reserva, pasado, estado } = horario;

  async function ejecutar(peticion, aviso) {
    setOcupado(true);
    setError('');
    try {
      await peticion();
      setPregunta(null);
      onCambio(aviso);
    } catch (e) {
      setError(e.message);
    } finally {
      setOcupado(false);
    }
  }
  const cambiarEstado = (nuevo) => ejecutar(
    () => solicitar(`/reservas/${reserva.id}`, { metodo: 'PATCH', cuerpo: { estado: nuevo } }),
    nuevo === 'confirmada' ? 'Reserva confirmada. Le avisamos por correo.' : 'Reserva cancelada. El horario vuelve a estar libre.',
  );
  const retirar = () => ejecutar(() => solicitar(`/disponibilidades/${horario.id}`, { metodo: 'DELETE' }), 'Horario retirado.');

  return (
    <Panel id="detalle-horario" titulo={`${diaLargo(horario.fecha)}`} onCerrar={onCerrar}>
      <p className="panel-agenda__hora">
        <Icono nombre="reloj" tamano={18} />
        <span>{horario.horaInicio} – {horario.horaFin} · {textoDuracion(aMinutos(horario.horaFin) - aMinutos(horario.horaInicio))}</span>
      </p>
      <span className={`estado-agenda estado-agenda--${estado}`}>{ESTADOS[estado]}{pasado ? ' · ya pasó' : ''}</span>
      {horario.bloqueado && <p className="panel-agenda__nota"><Icono nombre="candadoCerrado" tamano={16} /> Este día está bloqueado: el horario no se muestra a los usuarios.</p>}
      <Alerta>{error}</Alerta>
      {reserva ? (
        <>
          <dl className="panel-agenda__datos">
            <div><dt>Cliente</dt><dd><Link to={`/profesional/clientes/${reserva.usuario.id}`}>{reserva.usuario.nombre}</Link></dd></div>
            {reserva.modalidad && <div><dt>Modalidad</dt><dd>{modalidadTexto[reserva.modalidad]}</dd></div>}
            {reserva.primeraVisita !== null && <div><dt>Primera visita</dt><dd>{reserva.primeraVisita ? 'Sí' : 'No'}</dd></div>}
          </dl>
          <blockquote className="panel-agenda__mensaje">{reserva.mensaje}</blockquote>
          {pregunta ? (
            <Confirmar pregunta="¿Cancelar esta reserva? Le avisaremos a la persona por correo." accion="Sí, cancelar" ocupado={ocupado}
              onConfirmar={() => cambiarEstado('cancelada')} onVolver={() => setPregunta(null)} />
          ) : (
            <div className="panel-agenda__acciones">
              {!pasado && estado === 'pendiente' && (
                <button type="button" className="boton boton--principal boton--compacto" disabled={ocupado} onClick={() => cambiarEstado('confirmada')}>
                  <Icono nombre="check" tamano={18} /> Confirmar
                </button>
              )}
              <Link to={`/profesional/mensajes?reserva=${reserva.id}`} className="boton boton--secundario boton--compacto">
                <Icono nombre="chat" tamano={18} /> Mensajes
              </Link>
              {!pasado && (
                <button type="button" className="boton-texto panel-agenda__peligro" disabled={ocupado} onClick={() => setPregunta('cancelar')}>Cancelar reserva</button>
              )}
            </div>
          )}
        </>
      ) : !pasado ? (
        pregunta ? (
          <Confirmar pregunta="¿Retirar este horario? Dejará de aparecer para reservar." accion="Sí, retirar" ocupado={ocupado}
            onConfirmar={retirar} onVolver={() => setPregunta(null)} />
        ) : (
          <>
            <p className="panel-agenda__texto">Nadie ha reservado este horario todavía.</p>
            <div className="panel-agenda__acciones">
              <button type="button" className="boton boton--secundario boton--compacto" disabled={ocupado || horario.conHistorial} onClick={() => setPregunta('retirar')}>
                <Icono nombre="basura" tamano={18} /> Retirar horario
              </button>
            </div>
            {horario.conHistorial && <p className="panel-agenda__nota">Tiene reservas canceladas en su historial: se conserva y no se puede retirar desde aquí.</p>}
          </>
        )
      ) : (
        <p className="panel-agenda__texto">Este horario ya pasó y nadie lo reservó.</p>
      )}
    </Panel>
  );
}

const lista = (horas) => (horas.length < 2 ? horas.join('') : `${horas.slice(0, -1).join(', ')} y ${horas.at(-1)}`);

// Publicar horarios: uno solo o varios bloques de igual duración en el mismo día (POST /disponibilidades/serie).
export function PublicarHorarios({ inicial, hoy, onPublicado, onCerrar }) {
  const horaInicial = inicial?.hora || '09:00';
  const [campos, setCampos] = useState({
    fecha: inicial?.fecha || hoy,
    horaInicio: horaInicial,
    horaFin: aHora(Math.min(aMinutos(horaInicial) + (inicial?.hora ? 60 : 240), 23 * 60 + 45)),
    dividir: !inicial?.hora,
    duracion: 60,
  });
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState('');
  const previstos = bloquesPrevistos(campos);
  const cambiar = (cambio) => { setError(''); setCampos((actual) => ({ ...actual, ...cambio })); };

  async function publicar(evento) {
    evento.preventDefault();
    if (!previstos.length) { setError('Entre esas horas no cabe un bloque completo. Revisa el inicio, el término y la duración.'); return; }
    setOcupado(true);
    try {
      const { fecha, horaInicio, horaFin, duracion } = campos;
      if (campos.dividir) {
        const r = await solicitar('/disponibilidades/serie', { metodo: 'POST', cuerpo: { fecha, horaInicio, horaFin, duracion } });
        const omitidos = r.omitidos.length ? ` ${r.omitidos.length} no se publicaron porque chocaban con otro horario.` : '';
        onPublicado(`Publicaste ${r.horarios.length} ${r.horarios.length === 1 ? 'horario' : 'horarios'} el ${diaLargo(fecha)}.${omitidos}`, fecha);
      } else {
        await solicitar('/disponibilidades', { metodo: 'POST', cuerpo: { fecha, horaInicio, horaFin } });
        onPublicado(`Publicaste el horario del ${diaLargo(fecha)}, ${horaInicio} – ${horaFin}.`, fecha);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setOcupado(false);
    }
  }

  return (
    <Panel id="publicar-horarios" titulo="Publicar horarios" onCerrar={onCerrar}>
      <form className="formulario-agenda" onSubmit={publicar} noValidate>
        <label className="campo formulario-agenda__fecha">
          <span className="campo__etiqueta">Día</span>
          <input className="campo__control" type="date" required min={hoy} value={campos.fecha} onChange={(e) => cambiar({ fecha: e.target.value })} />
        </label>
        <div className="formulario-agenda__horas">
          <label className="campo">
            <span className="campo__etiqueta">Desde</span>
            <input className="campo__control" type="time" step="900" required value={campos.horaInicio} onChange={(e) => cambiar({ horaInicio: e.target.value })} />
          </label>
          <label className="campo">
            <span className="campo__etiqueta">Hasta</span>
            <input className="campo__control" type="time" step="900" required value={campos.horaFin} onChange={(e) => cambiar({ horaFin: e.target.value })} />
          </label>
        </div>
        <label className="interruptor">
          <input type="checkbox" checked={campos.dividir} onChange={(e) => cambiar({ dividir: e.target.checked })} />
          <span className="interruptor__pista" aria-hidden="true" />
          <span>Dividir en varios bloques</span>
        </label>
        {campos.dividir && (
          <div className="segmentos" role="group" aria-label="Duración de cada bloque">
            {duraciones.map((minutos) => (
              <button key={minutos} type="button" className="segmentos__opcion" aria-pressed={campos.duracion === minutos} onClick={() => cambiar({ duracion: minutos })}>
                {textoDuracion(minutos)}
              </button>
            ))}
          </div>
        )}
        <p className="formulario-agenda__previa" aria-live="polite">
          {previstos.length
            ? previstos.length > serie.maxBloques
              ? `Son ${previstos.length} bloques: publica hasta ${serie.maxBloques} de una vez.`
              : `${previstos.length === 1 ? 'Se publicará 1 horario' : `Se publicarán ${previstos.length} horarios`}: ${lista(previstos.slice(0, 6).map((b) => b.horaInicio))}${previstos.length > 6 ? ' y más' : ''}.`
            : 'Elige un inicio y un término con al menos un bloque completo.'}
        </p>
        <Alerta>{error}</Alerta>
        <button className="boton boton--principal" disabled={ocupado || !previstos.length || previstos.length > serie.maxBloques}>
          {ocupado ? 'Publicando…' : 'Publicar'}
        </button>
      </form>
    </Panel>
  );
}

// Fechas bloqueadas (vacaciones, congresos): sus horarios no se muestran ni se reservan.
export function BloquearFechas({ hoy, onCambio, onCerrar }) {
  const [campos, setCampos] = useState({ fechaInicio: hoy, fechaFin: hoy, motivo: '' });
  const [bloqueos, setBloqueos] = useState(null);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState('');
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let activo = true;
    solicitar('/agenda/bloqueos').then((r) => activo && setBloqueos(r.bloqueos)).catch((e) => activo && setError(e.message));
    return () => { activo = false; };
  }, [version]);

  async function bloquear(evento) {
    evento.preventDefault();
    setOcupado(true);
    setError('');
    try {
      await solicitar('/agenda/bloqueos', { metodo: 'POST', cuerpo: { ...campos, motivo: campos.motivo.trim() || null } });
      setCampos({ fechaInicio: hoy, fechaFin: hoy, motivo: '' });
      setVersion((v) => v + 1);
      onCambio('Fechas bloqueadas. Sus horarios ya no se muestran a los usuarios.');
    } catch (e) {
      setError(e.message);
    } finally {
      setOcupado(false);
    }
  }
  async function quitar(id) {
    setOcupado(true);
    setError('');
    try {
      await solicitar(`/agenda/bloqueos/${id}`, { metodo: 'DELETE' });
      setVersion((v) => v + 1);
      onCambio('Bloqueo quitado. Los horarios libres de esas fechas vuelven a mostrarse.');
    } catch (e) {
      setError(e.message);
    } finally {
      setOcupado(false);
    }
  }

  return (
    <Panel id="bloquear-fechas" titulo="Bloquear fechas" onCerrar={onCerrar}>
      <p className="panel-agenda__texto">Para vacaciones o días sin atención. No se puede bloquear un día con reservas activas.</p>
      <form className="formulario-agenda" onSubmit={bloquear} noValidate>
        <div className="formulario-agenda__horas">
          <label className="campo">
            <span className="campo__etiqueta">Desde</span>
            <input className="campo__control" type="date" required min={hoy} value={campos.fechaInicio}
              onChange={(e) => setCampos({ ...campos, fechaInicio: e.target.value, fechaFin: campos.fechaFin < e.target.value ? e.target.value : campos.fechaFin })} />
          </label>
          <label className="campo">
            <span className="campo__etiqueta">Hasta</span>
            <input className="campo__control" type="date" required min={campos.fechaInicio} max={sumarDias(campos.fechaInicio, reglasBloqueo.maxDias - 1)}
              value={campos.fechaFin} onChange={(e) => setCampos({ ...campos, fechaFin: e.target.value })} />
          </label>
        </div>
        <label className="campo">
          <span className="campo__etiqueta">Motivo (opcional)</span>
          <input className="campo__control" maxLength={reglasBloqueo.motivo.max} placeholder="Ej. Vacaciones" value={campos.motivo}
            onChange={(e) => setCampos({ ...campos, motivo: e.target.value })} />
        </label>
        <Alerta>{error}</Alerta>
        <button className="boton boton--principal" disabled={ocupado}>{ocupado ? 'Guardando…' : 'Bloquear fechas'}</button>
      </form>
      <h3 className="panel-agenda__subtitulo">Próximos bloqueos</h3>
      {!bloqueos ? <p className="texto-secundario" role="status">Cargando…</p> : bloqueos.length ? (
        <ul className="panel-agenda__lista">
          {bloqueos.map((b) => (
            <li key={b.id}>
              <span>
                <strong>{b.fechaInicio === b.fechaFin ? diaCorto(b.fechaInicio) : `${diaCorto(b.fechaInicio)} – ${diaCorto(b.fechaFin)}`}</strong>
                {b.motivo && <small>{b.motivo}</small>}
              </span>
              <button type="button" className="boton-texto" disabled={ocupado} onClick={() => quitar(b.id)} aria-label={`Quitar el bloqueo del ${diaLargo(b.fechaInicio)}`}>Quitar</button>
            </li>
          ))}
        </ul>
      ) : <p className="panel-agenda__texto">No tienes fechas bloqueadas.</p>}
    </Panel>
  );
}

// Resumen del costado cuando no hay nada elegido: lo de hoy, lo que falta confirmar y la lista de espera.
export function ResumenAgenda({ datos, pendientes, onElegirPendiente }) {
  const hoyHorarios = datos.horarios.filter((h) => h.fecha === datos.hoy);
  const citasHoy = hoyHorarios.filter((h) => h.reserva && h.estado === 'confirmada');
  return (
    <div className="resumen-agenda">
      <section className="panel-agenda" aria-labelledby="titulo-hoy">
        <h2 id="titulo-hoy" className="panel-agenda__titulo-chico">Hoy</h2>
        <dl className="resumen-agenda__cifras">
          <div><dt>Citas</dt><dd className="cifra">{citasHoy.length}</dd></div>
          <div><dt>Horas libres</dt><dd className="cifra">{hoyHorarios.filter((h) => h.estado === 'libre' && !h.pasado).length}</dd></div>
        </dl>
        {citasHoy.length > 0 && (
          <ul className="panel-agenda__lista">
            {citasHoy.map((h) => (
              <li key={h.id}><span><strong className="cifra">{h.horaInicio}</strong><small>{h.reserva.usuario.nombre}</small></span></li>
            ))}
          </ul>
        )}
      </section>
      <section className="panel-agenda" aria-labelledby="titulo-por-confirmar">
        <h2 id="titulo-por-confirmar" className="panel-agenda__titulo-chico">
          Por confirmar {pendientes?.length ? <span className="resumen-agenda__contador">{pendientes.length}</span> : null}
        </h2>
        {!pendientes ? <p className="texto-secundario" role="status">Cargando…</p> : pendientes.length ? (
          <ul className="panel-agenda__lista">
            {pendientes.slice(0, 5).map((r) => (
              <li key={r.id}>
                <button type="button" className="resumen-agenda__pendiente" onClick={() => onElegirPendiente(r)}>
                  <span><strong>{r.usuario.nombre}</strong><small>{diaCorto(r.horario.fecha)} · {r.horario.horaInicio}</small></span>
                  <Icono nombre="flecha" tamano={16} />
                </button>
              </li>
            ))}
          </ul>
        ) : <p className="panel-agenda__texto">No tienes solicitudes pendientes.</p>}
      </section>
      {datos.listaEspera > 0 && (
        <p className="resumen-agenda__espera">
          <Icono nombre="campana" tamano={18} />
          <span><strong>{datos.listaEspera} {datos.listaEspera === 1 ? 'persona espera' : 'personas esperan'}</strong> una hora contigo. Al publicar horarios les avisamos por correo.</span>
        </p>
      )}
    </div>
  );
}

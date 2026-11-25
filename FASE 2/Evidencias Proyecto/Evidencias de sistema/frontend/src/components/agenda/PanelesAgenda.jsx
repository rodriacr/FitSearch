import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import reglas from '@shared/reglas.json';
import Alerta from '../Alerta.jsx';
import Icono from '../Icono.jsx';
import { solicitar } from '../../services/api.js';
import { ahoraChile, textoDuracion } from '../../services/agenda.js';
import { fechaValida } from '../../services/reservas.js';
import { aHora, aMinutos, bloquesPrevistos, diaCorto, diaLargo, ESTADOS, estadoVisible, NOTA_ESTADO, sumarDias } from './semana.js';
import '../Interruptor.css';
import './PanelesAgenda.css';

const { duraciones, serie, bloqueo: reglasBloqueo } = reglas.agenda;

// Marco común de los paneles del costado: título, botón para cerrar y foco al abrirse.
function Panel({ titulo, onCerrar, children, id, ocupado = false }) {
  const encabezado = useRef(null);
  useEffect(() => { encabezado.current?.focus({ preventScroll: true }); }, [id]);
  return (
    <section className="panel-agenda" aria-labelledby={`${id}-titulo`} onKeyDown={(e) => { if (e.key === 'Escape' && !ocupado) onCerrar?.(); }}>
      <header className="panel-agenda__cabecera">
        <h2 id={`${id}-titulo`} ref={encabezado} tabIndex={-1}>{titulo}</h2>
        {onCerrar && (
          <button type="button" className="boton-icono panel-agenda__cerrar" aria-label="Cerrar panel" onClick={onCerrar} disabled={ocupado}>
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
  const visible = estadoVisible(horario);

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
      <span className={`estado-agenda estado-agenda--${visible}`}>{ESTADOS[visible]}</span>
      {NOTA_ESTADO[visible] && <p className="panel-agenda__nota">{NOTA_ESTADO[visible]}</p>}
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
          {/* Si la hora llega con la pregunta de cancelar abierta (revisión del PR 63), la pregunta se cierra sola. */}
          {pregunta && !pasado ? (
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

const cantidadHorarios = (n) => `${n} ${n === 1 ? 'horario' : 'horarios'}`;

function primerosCampos(inicial, ahora) {
  const hoy = ahora.slice(0, 10);
  let fecha = inicial?.fecha ?? hoy;
  let horaInicio = inicial?.hora ?? '09:00';
  if (!inicial?.hora && fecha === hoy) {
    const siguienteMediaHora = (Math.floor(aMinutos(ahora.slice(11)) / 30) + 1) * 30;
    if (siguienteMediaHora + 60 >= 24 * 60) fecha = sumarDias(hoy, 1);
    else horaInicio = aHora(Math.max(aMinutos(horaInicio), siguienteMediaHora));
  }
  return {
    fecha, horaInicio,
    horaFin: aHora(Math.min(aMinutos(horaInicio) + (inicial?.hora ? 60 : 240), 23 * 60 + 59)),
    dividir: !inicial?.hora, duracion: 60,
  };
}

function validarPublicacion(campos, ahora, hasta, bloqueado, cantidad) {
  const { fecha, horaInicio, horaFin } = campos;
  if (!fechaValida(fecha) || fecha < ahora.slice(0, 10) || fecha > hasta) return 'Elige un día dentro de los próximos 12 meses.';
  if (bloqueado) return 'Este día está bloqueado. Elige otro día para publicar.';
  if (!horaInicio || !horaFin || horaInicio >= horaFin) return 'La hora de término debe ser posterior a la de inicio.';
  if (`${fecha}T${horaInicio}` <= ahora) return 'El horario debe comenzar más tarde, en hora de Chile.';
  if (!cantidad) return 'En ese rango no cabe un bloque completo de la duración elegida.';
  if (cantidad > serie.maxBloques) return `Puedes publicar hasta ${serie.maxBloques} horarios a la vez.`;
  return '';
}

// Publicar horarios: uno solo o varios bloques de igual duración en el mismo día (POST /disponibilidades/serie).
// onPrevia: avisa el día y las horas que se están por publicar, para marcarlos en el calendario (15-11-2026).
export function PublicarHorarios({ inicial, ahora, datos, onDia, onPublicado, onCerrar, onPrevia, onRevisar }) {
  const [campos, setCampos] = useState(() => primerosCampos(inicial, ahora));
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState('');
  const hoy = ahora.slice(0, 10);
  const hasta = sumarDias(hoy, 365);
  const { fecha, horaInicio, horaFin, dividir, duracion } = campos;
  const conoceDia = datos && fecha >= datos.desde && fecha <= datos.hasta;
  const bloqueado = conoceDia && datos.bloqueos.some((b) => b.fechaInicio <= fecha && fecha <= b.fechaFin);
  const bloques = useMemo(() => bloquesPrevistos(campos), [campos]);
  const validacion = validarPublicacion(campos, ahora, hasta, bloqueado, bloques.length);
  const previstos = useMemo(() => {
    if (validacion) return [];
    const horarios = conoceDia ? datos.horarios.filter((h) => h.fecha === fecha && !h.retirado) : [];
    return bloques.map((bloque) => ({
      ...bloque,
      ocupado: horarios.some((h) => h.horaInicio < bloque.horaFin && h.horaFin > bloque.horaInicio),
    }));
  }, [bloques, conoceDia, datos, fecha, validacion]);
  const libres = useMemo(() => previstos.filter((b) => !b.ocupado), [previstos]);
  const disponibles = libres.length;
  const conflictos = previstos.length - disponibles;
  const resto = previstos.length ? aMinutos(horaFin) - aMinutos(previstos.at(-1).horaFin) : 0;
  const cambiar = (cambio) => { setError(''); setCampos((actual) => ({ ...actual, ...cambio })); };
  const elegirFecha = (nuevaFecha) => {
    cambiar({ fecha: nuevaFecha });
    if (fechaValida(nuevaFecha) && nuevaFecha >= hoy && nuevaFecha <= hasta) onDia(nuevaFecha);
  };
  useEffect(() => {
    onPrevia(libres.length ? { fecha, bloques: libres } : null);
  }, [fecha, libres, onPrevia]);
  useEffect(() => () => onPrevia(null), [onPrevia]);

  async function publicar(evento) {
    evento.preventDefault();
    if (ocupado || !disponibles) return;
    const vigente = validarPublicacion(campos, ahoraChile(), hasta, bloqueado, bloques.length);
    if (vigente) { setError(vigente); return; }
    setOcupado(true);
    setError('');
    try {
      if (dividir) {
        const r = await solicitar('/disponibilidades/serie', { metodo: 'POST', cuerpo: { fecha, horaInicio, horaFin, duracion } });
        if (!r.horarios.length) {
          setError('Los horarios coinciden con otros que ya están publicados. Ajusta el rango e inténtalo de nuevo.');
          onRevisar();
          return;
        }
        const omitidos = r.omitidos.length ? ` ${cantidadHorarios(r.omitidos.length)} con cruce: ${r.omitidos.map((b) => `${b.horaInicio}–${b.horaFin}`).join(', ')}.` : '';
        onPublicado(`Publicaste ${cantidadHorarios(r.horarios.length)} el ${diaLargo(fecha)}.${omitidos}`, fecha);
      } else {
        await solicitar('/disponibilidades', { metodo: 'POST', cuerpo: { fecha, horaInicio, horaFin } });
        onPublicado(`Publicaste el horario del ${diaLargo(fecha)}, ${horaInicio} – ${horaFin}.`, fecha);
      }
    } catch (e) {
      setError(e.message);
      if (e.estado === 409) onRevisar();
    } finally {
      setOcupado(false);
    }
  }

  return (
    <Panel id="publicar-horarios" titulo="Publicar horarios" onCerrar={onCerrar} ocupado={ocupado}>
      <form className="formulario-agenda" onSubmit={publicar} noValidate>
        <fieldset className="publicar-horarios__campos" disabled={ocupado}>
          <label className="campo">
            <span className="campo__etiqueta">Día</span>
            <input className="campo__control" type="date" required min={hoy} max={hasta} value={fecha} onChange={(e) => elegirFecha(e.target.value)} />
          </label>
          <div className="formulario-agenda__horas">
            <label className="campo">
              <span className="campo__etiqueta">Desde</span>
              <input className="campo__control" type="time" required value={horaInicio} onChange={(e) => cambiar({ horaInicio: e.target.value })} />
            </label>
            <label className="campo">
              <span className="campo__etiqueta">Hasta</span>
              <input className="campo__control" type="time" required value={horaFin} onChange={(e) => cambiar({ horaFin: e.target.value })} />
            </label>
          </div>
          <label className="interruptor">
            <input type="checkbox" checked={dividir} onChange={(e) => cambiar({ dividir: e.target.checked })} />
            <span className="interruptor__pista" aria-hidden="true" />
            <span>Dividir en varios bloques</span>
          </label>
          {dividir && (
            <div className="publicar-horarios__duracion">
              <span id="duracion-bloques" className="campo__etiqueta">Duración de cada bloque</span>
              <div className="segmentos" role="group" aria-labelledby="duracion-bloques">
                {duraciones.map((minutos) => (
                  <button key={minutos} type="button" className="segmentos__opcion" aria-pressed={duracion === minutos} onClick={() => cambiar({ duracion: minutos })}>
                    {textoDuracion(minutos)}
                  </button>
                ))}
              </div>
            </div>
          )}
        </fieldset>
        <div className="publicar-horarios__previa">
          <p aria-live="polite">{validacion || (disponibles ? `${cantidadHorarios(disponibles)} para publicar` : 'Todos los bloques coinciden con horarios publicados.')}</p>
          {conflictos > 0 && disponibles > 0 && <p className="publicar-horarios__cruces">{cantidadHorarios(conflictos)} con cruce en tu agenda.</p>}
          {resto > 0 && <p>Quedan {textoDuracion(resto)} fuera de los bloques completos.</p>}
          {previstos.length > 0 && (
            <details>
              <summary>Ver bloques</summary>
              <ul>{previstos.map((b) => <li key={b.horaInicio}><span>{b.horaInicio}–{b.horaFin}</span>{b.ocupado && <span className="publicar-horarios__cruces">Con cruce</span>}</li>)}</ul>
            </details>
          )}
        </div>
        <Alerta>{error}</Alerta>
        <button className="boton boton--principal" disabled={ocupado || !disponibles}>
          {ocupado ? 'Publicando…' : disponibles > 1 ? `Publicar ${cantidadHorarios(disponibles)}` : 'Publicar horario'}
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

const MODALIDAD_CORTA = { presencial: 'Presencial', online: 'Online' };

// Reservas del día elegido (pedido del PO del 15-11-2026): todas, ordenadas por hora y con su estado, para no tener que
// buscarlas en el calendario. Empieza en hoy; las flechas, el selector de fecha y la cabecera del calendario cambian el día.
function ReservasDelDia({ datos, dia, onDia, onElegirHorario }) {
  const delDia = datos.horarios.filter((h) => h.fecha === dia);
  const reservas = delDia.filter((h) => h.reserva).sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));
  const libres = delDia.filter((h) => estadoVisible(h) === 'libre').length;
  const esHoy = dia === datos.hoy;
  return (
    <section className="panel-agenda resumen-agenda__dia" aria-labelledby="titulo-dia">
      <header className="resumen-agenda__dia-cabecera">
        <h2 id="titulo-dia" className="panel-agenda__titulo-chico">Reservas del día</h2>
        {!esHoy && <button type="button" className="boton-texto" onClick={() => onDia(datos.hoy)}>Ir a hoy</button>}
      </header>
      <p className="resumen-agenda__fecha-texto" aria-live="polite">{esHoy ? `Hoy, ${diaLargo(dia)}` : diaLargo(dia)}</p>
      <div className="resumen-agenda__dia-navegacion">
        <button type="button" className="boton-icono" aria-label="Día anterior" onClick={() => onDia(sumarDias(dia, -1))}>
          <Icono nombre="chevronIzquierda" tamano={18} />
        </button>
        <input type="date" className="resumen-agenda__fecha" aria-label="Elegir el día" value={dia}
          onChange={(e) => { if (/^\d{4}-\d{2}-\d{2}$/.test(e.target.value)) onDia(e.target.value); }} />
        <button type="button" className="boton-icono" aria-label="Día siguiente" onClick={() => onDia(sumarDias(dia, 1))}>
          <Icono nombre="chevronDerecha" tamano={18} />
        </button>
      </div>
      <dl className="resumen-agenda__cifras">
        <div><dt>Reservas</dt><dd className="cifra">{reservas.length}</dd></div>
        <div><dt>Horas libres</dt><dd className="cifra">{libres}</dd></div>
      </dl>
      {reservas.length ? (
        <ul className="resumen-agenda__reservas" aria-label={`Reservas del ${diaLargo(dia)}`}>
          {reservas.map((h) => {
            const visible = estadoVisible(h);
            return (
              <li key={h.id}>
                <button type="button" className="resumen-agenda__reserva" onClick={() => onElegirHorario(h)}
                  aria-label={`${h.horaInicio} a ${h.horaFin}, ${h.reserva.usuario.nombre}, ${ESTADOS[visible].toLowerCase()}${h.reserva.modalidad ? `, ${MODALIDAD_CORTA[h.reserva.modalidad].toLowerCase()}` : ''}`}>
                  <time className="resumen-agenda__hora">{h.horaInicio}<small>{h.horaFin}</small></time>
                  <span className="resumen-agenda__quien">
                    <strong>{h.reserva.usuario.nombre}</strong>
                    <span className="resumen-agenda__datos">
                      <span className={`estado-agenda estado-agenda--${visible}`}>{ESTADOS[visible]}</span>
                      {h.reserva.modalidad && <small>{MODALIDAD_CORTA[h.reserva.modalidad]}{h.reserva.primeraVisita ? ' · 1.ª visita' : ''}</small>}
                    </span>
                  </span>
                  <Icono nombre="chevronDerecha" tamano={16} className="resumen-agenda__flecha" />
                </button>
              </li>
            );
          })}
        </ul>
      ) : <p className="panel-agenda__texto">{esHoy ? 'No tienes reservas hoy.' : 'No tienes reservas este día.'}</p>}
    </section>
  );
}

// Resumen del costado cuando no hay nada elegido: las reservas del día, lo que falta confirmar y la lista de espera.
// En pantallas angostas el calendario ya muestra la lista del día, así que aquí se omite (conLista).
export function ResumenAgenda({ datos, dia, onDia, onElegirHorario, conLista = true, pendientes, errorPendientes, onReintentarPendientes, onElegirPendiente }) {
  return (
    <div className="resumen-agenda">
      {conLista && <ReservasDelDia datos={datos} dia={dia} onDia={onDia} onElegirHorario={onElegirHorario} />}
      <section className="panel-agenda" aria-labelledby="titulo-por-confirmar">
        <h2 id="titulo-por-confirmar" className="panel-agenda__titulo-chico">
          Por confirmar {pendientes?.length ? <span className="resumen-agenda__contador">{pendientes.length}</span> : null}
        </h2>
        {errorPendientes ? <div><p role="alert">No pudimos comprobar las solicitudes pendientes. {errorPendientes}</p><button type="button" className="boton-texto" onClick={onReintentarPendientes}>Reintentar solicitudes</button></div> : !pendientes ? <p className="texto-secundario" role="status">Cargando…</p> : pendientes.length ? (
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

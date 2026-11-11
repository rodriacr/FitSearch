import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import reglas from '@shared/reglas.json';
import Alerta from '../components/Alerta.jsx';
import EstadoVacio from '../components/EstadoVacio.jsx';
import Icono from '../components/Icono.jsx';
import { diaCorto, diaLargo } from '../components/agenda/semana.js';
import { coincidencias, extracto, partes, terminos } from '../components/mensajes/buscar.js';
import { useSesion } from '../context/SesionContext.jsx';
import { solicitar } from '../services/api.js';
import { iniciales } from '../services/formato.js';
import './Mensajes.css';

const { texto: limites, intervaloSegundos } = reglas.mensajesReserva;
const ESTADO = { pendiente: 'Por confirmar', confirmada: 'Confirmada', cancelada: 'Cancelada' };
const HORA = new Intl.DateTimeFormat('es-CL', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'America/Santiago' });
const DIA = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Santiago' });
const diaDe = (iso) => DIA.format(new Date(iso));
const cuando = (iso) => `${diaCorto(diaDe(iso))}, ${HORA.format(new Date(iso))}`;

// Pide una ruta y la repite cada cierto tiempo mientras la pantalla está abierta (sin WebSockets: basta para coordinar).
function useConsultaPeriodica(ruta, revision) {
  const [estado, setEstado] = useState({ ruta: null });
  useEffect(() => {
    if (!ruta) return undefined;
    let activo = true;
    const pedir = () => solicitar(ruta)
      .then((datos) => activo && setEstado({ ruta, datos }))
      .catch((error) => activo && setEstado((actual) => ({ ruta, datos: actual.ruta === ruta ? actual.datos : undefined, error })));
    pedir();
    const temporizador = setInterval(() => { if (document.visibilityState !== 'hidden') pedir(); }, intervaloSegundos * 1000);
    return () => { activo = false; clearInterval(temporizador); };
  }, [ruta, revision]);
  return estado.ruta === ruta ? estado : { ruta };
}

// Los enlaces desde una reserva (Mis citas, la agenda, la ficha del cliente) llegan como ?reserva=ID: se abre el chat de
// esa pareja (uno solo, con todo su historial) y se cambia la dirección por la del chat.
function useAbrirDesdeReserva(reserva, base) {
  const navegar = useNavigate();
  const [error, setError] = useState(null);
  useEffect(() => {
    if (!reserva) return undefined;
    let activo = true;
    if (!/^\d+$/.test(reserva)) {
      navegar(base, { replace: true });
      return undefined;
    }
    solicitar('/chats', { metodo: 'POST', cuerpo: { reservaId: Number(reserva) } })
      .then(({ id }) => activo && navegar(`${base}/${id}`, { replace: true }))
      .catch((e) => activo && setError({ reserva, mensaje: e.estado === 404 ? 'No encontramos el chat de esa reserva.' : e.message }));
    return () => { activo = false; };
  }, [reserva, base, navegar]);
  return error?.reserva === reserva ? error.mensaje : '';
}

function Texto({ texto, palabras }) {
  const tramos = palabras.length ? coincidencias(texto, palabras) : null;
  if (!tramos) return texto;
  return partes(texto, tramos).map((p, i) => (p.marca ? <mark key={i}>{p.texto}</mark> : p.texto));
}

function Bandeja({ base, chats, activo, profesional, onElegir }) {
  if (!chats.length) {
    return (
      <EstadoVacio compacto icono="chat" titulo="Aún no tienes chats">
        {profesional ? 'Cuando alguien reserve una hora contigo, podrán escribirse aquí.' : 'Cuando reserves una hora, podrás escribirle al profesional aquí.'}
      </EstadoVacio>
    );
  }
  const hoy = DIA.format(new Date());
  return (
    <ul className="mensajes__lista">
      {chats.map((c) => {
        const resumen = c.ultimo ? `${c.ultimo.propio ? 'Tú: ' : ''}${c.ultimo.texto}`
          : c.ultimaCita ? `Cita del ${diaCorto(c.ultimaCita.fecha)}, ${c.ultimaCita.horaInicio} · ${ESTADO[c.ultimaCita.estado]}`
            : 'Sin mensajes';
        return (
          <li key={c.id}>
            <Link to={`${base}/${c.id}`} onClick={onElegir} className={`conversacion${c.id === activo ? ' conversacion--activa' : ''}`}
              aria-current={c.id === activo ? 'page' : undefined}>
              <span className="avatar conversacion__avatar" aria-hidden="true">{iniciales(c.con.nombre)}</span>
              <span className="conversacion__texto">
                <span className="conversacion__fila">
                  <strong>{c.con.nombre}</strong>
                  <time dateTime={c.actividad}>{diaDe(c.actividad) === hoy ? HORA.format(new Date(c.actividad)) : diaCorto(diaDe(c.actividad))}</time>
                </span>
                <span className="conversacion__fila">
                  <span className="conversacion__ultimo">{resumen}</span>
                  {c.noLeidos > 0 && <span className="conversacion__no-leidos" aria-label={`${c.noLeidos} sin leer`}>{c.noLeidos}</span>}
                </span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

// Todo lo que muestra el chat, en orden: los mensajes y el aviso de cada reserva de la pareja (con su mensaje inicial).
function elementosDelHilo(reservas, mensajes) {
  return [
    ...reservas.map((r) => ({ clave: `r${r.id}`, tipo: 'reserva', fecha: r.fecha, texto: r.mensaje, reserva: r })),
    ...mensajes.map((m) => ({ clave: `m${m.id}`, tipo: 'mensaje', fecha: m.fecha, texto: m.texto, mensaje: m })),
  ].sort((a, b) => a.fecha.localeCompare(b.fecha));
}

function AvisoReserva({ elemento, nombre, profesional, palabras, destacado }) {
  const { reserva } = elemento;
  return (
    <li id={`chat-${elemento.clave}`} tabIndex={-1} className={`aviso-reserva${destacado ? ' aviso-reserva--destacado' : ''}`}>
      <p className="aviso-reserva__titulo">
        <Icono nombre="calendario" tamano={16} />
        <span>
          {profesional ? `${nombre} reservó` : 'Reservaste'} para el{' '}
          <time dateTime={reserva.cita.fecha}>{diaCorto(reserva.cita.fecha)}, {reserva.cita.horaInicio}–{reserva.cita.horaFin}</time>
        </span>
        <span className={`aviso-reserva__estado aviso-reserva__estado--${reserva.estado}`}>{ESTADO[reserva.estado]}</span>
      </p>
      <p className="aviso-reserva__mensaje"><Texto texto={reserva.mensaje} palabras={palabras} /></p>
    </li>
  );
}

// Mensajes agrupados por día (hora de Chile), con los propios a la derecha. Si se eligió un resultado de la búsqueda,
// el chat se desplaza hasta él y lo destaca; si no, queda abajo, en lo más reciente.
function Hilo({ elementos, nombre, profesional, palabras, destacado }) {
  // Se desplaza solo la lista (no la ventana): scrollIntoView movería también la página en el celular.
  // Mientras la persona esté al final, el chat sigue pegado abajo aunque cambie el alto (fuentes que cargan, la barra de
  // eliminar o buscar que se abre); si subió a leer algo, no se la mueve.
  const lista = useRef(null);
  const pegado = useRef(true);
  const destacadoActual = useRef(destacado);
  const ultimo = elementos.at(-1)?.clave;
  useEffect(() => { destacadoActual.current = destacado; }, [destacado]);
  useEffect(() => {
    if (destacadoActual.current || !lista.current) return;
    pegado.current = true;
    lista.current.scrollTop = lista.current.scrollHeight;
  }, [ultimo]);
  useEffect(() => {
    const caja = lista.current;
    if (!caja || typeof ResizeObserver === 'undefined') return undefined;
    const observador = new ResizeObserver(() => { if (pegado.current && !destacadoActual.current) caja.scrollTop = caja.scrollHeight; });
    observador.observe(caja);
    for (const hijo of caja.children) observador.observe(hijo);
    return () => observador.disconnect();
  }, [elementos]);
  useEffect(() => {
    const elemento = destacado && document.getElementById(`chat-${destacado}`);
    if (!elemento || !lista.current) return;
    lista.current.scrollTop = Math.max(0, elemento.offsetTop - (lista.current.clientHeight - elemento.offsetHeight) / 2);
    elemento.focus({ preventScroll: true });
  }, [destacado]);
  if (!elementos.length) {
    return (
      <div className="hilo hilo--vacio">
        <p>No hay mensajes. Escribe para retomar la conversación con {nombre}.</p>
      </div>
    );
  }
  return (
    <ol ref={lista} className="hilo" aria-label="Mensajes"
      onScroll={(e) => { const c = e.currentTarget; pegado.current = c.scrollHeight - c.scrollTop - c.clientHeight < 48; }}>
      {elementos.map((e, indice) => {
        const dia = diaDe(e.fecha);
        const nuevoDia = indice === 0 || diaDe(elementos[indice - 1].fecha) !== dia;
        return [
          nuevoDia && <li key={`dia-${dia}`} className="hilo__dia" aria-hidden="true"><span>{diaLargo(dia)}</span></li>,
          e.tipo === 'reserva'
            ? <AvisoReserva key={e.clave} elemento={e} nombre={nombre} profesional={profesional} palabras={palabras} destacado={e.clave === destacado} />
            : (
              <li key={e.clave} id={`chat-${e.clave}`} tabIndex={-1}
                className={`mensaje-chat${e.mensaje.propio ? ' mensaje-chat--propio' : ''}${e.clave === destacado ? ' mensaje-chat--destacado' : ''}`}>
                <span className="solo-lector">{e.mensaje.propio ? 'Tú' : nombre}: </span>
                <p><Texto texto={e.texto} palabras={palabras} /></p>
                <time dateTime={e.fecha}>{HORA.format(new Date(e.fecha))}{e.mensaje.propio && e.mensaje.leido ? ' · Leído' : ''}</time>
              </li>
            ),
        ];
      })}
    </ol>
  );
}

function Resultados({ resultados, consulta, nombre, onElegir }) {
  if (!resultados.length) {
    return (
      <div className="resultados-chat resultados-chat--vacio">
        <p>No encontramos «{consulta.trim()}» en este chat.</p>
      </div>
    );
  }
  return (
    <ol className="resultados-chat" aria-label="Resultados de la búsqueda">
      {[...resultados].reverse().map((r) => {
        const corte = extracto(r.texto, r.tramos);
        const autor = r.tipo === 'reserva' ? 'Mensaje de la reserva' : r.mensaje.propio ? 'Tú' : nombre;
        return (
          <li key={r.clave}>
            <button type="button" className="resultado-chat" onClick={() => onElegir(r.clave)}>
              <span className="resultado-chat__fila">
                <strong>{autor}</strong>
                <time dateTime={r.fecha}>{cuando(r.fecha)}</time>
              </span>
              <span className="resultado-chat__texto">
                {corte.antes && '…'}
                {corte.partes.map((p, i) => (p.marca ? <mark key={i}>{p.texto}</mark> : p.texto))}
                {corte.despues && '…'}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

function Redactar({ chatId, onEnviado }) {
  const [texto, setTexto] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState('');
  const campo = useRef(null);
  async function enviar(evento) {
    evento?.preventDefault();
    if (!texto.trim() || ocupado) return;
    setOcupado(true);
    setError('');
    try {
      await solicitar(`/chats/${chatId}/mensajes`, { metodo: 'POST', cuerpo: { texto } });
      setTexto('');
      onEnviado();
      campo.current?.focus();
    } catch (e) {
      setError(e.message);
    } finally {
      setOcupado(false);
    }
  }
  return (
    <form className="redactar" onSubmit={enviar}>
      <Alerta>{error}</Alerta>
      <label htmlFor="texto-mensaje" className="solo-lector">Escribe un mensaje</label>
      <textarea id="texto-mensaje" ref={campo} className="campo__control redactar__campo" rows={1} maxLength={limites.max} value={texto}
        placeholder="Escribe un mensaje" onChange={(e) => setTexto(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar(); } }} />
      <button className="boton boton--principal redactar__enviar" disabled={ocupado || !texto.trim()} aria-label="Enviar mensaje">
        <Icono nombre="enviar" tamano={20} />
      </button>
    </form>
  );
}

// Confirmación antes de eliminar: el foco parte en «Cancelar» para que un Enter apurado no borre nada.
function ConfirmarEliminar({ chatId, nombre, onEliminado, onCancelar }) {
  const cancelar = useRef(null);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { cancelar.current?.focus(); }, []);
  async function eliminar() {
    setOcupado(true);
    setError('');
    try {
      await solicitar(`/chats/${chatId}`, { metodo: 'DELETE' });
      onEliminado();
    } catch (e) {
      setError(e.message);
      setOcupado(false);
    }
  }
  return (
    <div className="confirmar-eliminar" role="alertdialog" aria-labelledby="titulo-eliminar" aria-describedby="detalle-eliminar"
      onKeyDown={(e) => { if (e.key === 'Escape') onCancelar(); }}>
      <div className="confirmar-eliminar__texto">
        <p id="titulo-eliminar"><strong>¿Eliminar este chat?</strong></p>
        <p id="detalle-eliminar">
          Se borra el historial solo para ti; {nombre} lo seguirá viendo. Si vuelven a escribirse, el chat aparecerá de nuevo solo con lo nuevo.
        </p>
      </div>
      <div className="confirmar-eliminar__acciones">
        <button type="button" className="boton boton--compacto confirmar-eliminar__si" disabled={ocupado} onClick={eliminar}>
          {ocupado ? 'Eliminando…' : 'Eliminar chat'}
        </button>
        <button type="button" ref={cancelar} className="boton boton--secundario boton--compacto" disabled={ocupado} onClick={onCancelar}>Cancelar</button>
      </div>
      <Alerta>{error}</Alerta>
    </div>
  );
}

function ChatAbierto({ base, datos, profesional, onEnviado, onEliminado }) {
  const { chat, mensajes } = datos;
  const { con } = chat;
  const [buscando, setBuscando] = useState(false);
  const [consulta, setConsulta] = useState('');
  const [verResultados, setVerResultados] = useState(true);
  const [destacado, setDestacado] = useState(null);
  const [confirmar, setConfirmar] = useState(false);
  const botonBuscar = useRef(null);
  const botonEliminar = useRef(null);
  const campoBuscar = useRef(null);
  const elementos = useMemo(() => elementosDelHilo(chat.reservas, mensajes), [chat.reservas, mensajes]);
  const palabras = useMemo(() => (buscando ? terminos(consulta) : []), [buscando, consulta]);
  const resultados = useMemo(() => (palabras.length
    ? elementos.map((e) => ({ ...e, tramos: coincidencias(e.texto, palabras) })).filter((e) => e.tramos)
    : []), [elementos, palabras]);
  const enResultados = palabras.length > 0 && verResultados;

  const ahora = new Date();
  const momento = `${DIA.format(ahora)} ${HORA.format(ahora)}`;
  const proxima = chat.reservas.filter((r) => r.estado !== 'cancelada' && `${r.cita.fecha} ${r.cita.horaInicio}` > momento)
    .sort((a, b) => `${a.cita.fecha}${a.cita.horaInicio}`.localeCompare(`${b.cita.fecha}${b.cita.horaInicio}`))[0];

  useEffect(() => { if (buscando) campoBuscar.current?.focus(); }, [buscando]);

  function cerrarBusqueda() {
    setBuscando(false);
    setConsulta('');
    setDestacado(null);
    setVerResultados(true);
    botonBuscar.current?.focus();
  }
  function cerrarConfirmacion() {
    setConfirmar(false);
    botonEliminar.current?.focus();
  }
  const cuenta = !palabras.length ? (consulta.trim() ? 'Escribe al menos 2 letras' : '')
    : resultados.length === 1 ? '1 resultado' : `${resultados.length} resultados`;

  return (
    <>
      <header className="mensajes__cabecera">
        <Link to={base} className="boton-icono mensajes__volver" aria-label="Volver a los chats"><Icono nombre="flechaIzquierda" tamano={20} /></Link>
        <span className="avatar mensajes__avatar" aria-hidden="true">{iniciales(con.nombre)}</span>
        <div className="mensajes__quien">
          <h2>
            {con.profesionalId
              ? <Link to={`/profesionales/${con.profesionalId}`}>{con.nombre}</Link>
              : <Link to={`/profesional/clientes/${con.clienteId}`}>{con.nombre}</Link>}
          </h2>
          <p>{con.detalle}{proxima ? ` · Próxima cita: ${diaCorto(proxima.cita.fecha)}, ${proxima.cita.horaInicio}` : ''}</p>
        </div>
        <div className="mensajes__herramientas">
          <button type="button" ref={botonBuscar} className="boton-icono" aria-label="Buscar en el chat" title="Buscar en el chat"
            aria-expanded={buscando} aria-controls="buscador-chat" onClick={() => (buscando ? cerrarBusqueda() : setBuscando(true))}>
            <Icono nombre="buscar" tamano={20} />
          </button>
          <button type="button" ref={botonEliminar} className="boton-icono mensajes__eliminar" aria-label="Eliminar chat" title="Eliminar chat"
            aria-expanded={confirmar} onClick={() => (confirmar ? cerrarConfirmacion() : setConfirmar(true))}>
            <Icono nombre="basura" tamano={20} />
          </button>
        </div>
      </header>

      {confirmar && <ConfirmarEliminar chatId={chat.id} nombre={con.nombre} onEliminado={onEliminado} onCancelar={cerrarConfirmacion} />}

      {buscando && (
        <div className="buscador-chat" id="buscador-chat" role="search">
          <Icono nombre="buscar" tamano={18} />
          <label htmlFor="buscar-en-chat" className="solo-lector">Buscar palabras en el chat</label>
          <input id="buscar-en-chat" ref={campoBuscar} type="search" className="buscador-chat__campo" placeholder="Buscar palabras en el chat"
            autoComplete="off" value={consulta}
            onChange={(e) => { setConsulta(e.target.value); setVerResultados(true); setDestacado(null); }}
            onKeyDown={(e) => { if (e.key === 'Escape') cerrarBusqueda(); }} />
          {palabras.length > 0 && !verResultados ? (
            <button type="button" className="boton-texto buscador-chat__volver" onClick={() => setVerResultados(true)}>
              Resultados ({resultados.length})
            </button>
          ) : <span className="buscador-chat__cuenta" role="status">{cuenta}</span>}
          <button type="button" className="boton-icono buscador-chat__cerrar" aria-label="Cerrar la búsqueda" onClick={cerrarBusqueda}>
            <Icono nombre="cerrar" tamano={18} />
          </button>
        </div>
      )}

      {enResultados
        ? <Resultados resultados={resultados} consulta={consulta} nombre={con.nombre}
          onElegir={(clave) => { setDestacado(clave); setVerResultados(false); }} />
        : <Hilo elementos={elementos} nombre={con.nombre} profesional={profesional} palabras={palabras} destacado={destacado} />}
      <Redactar chatId={chat.id} onEnviado={onEnviado} />
    </>
  );
}

// Chat entre usuario y profesional (FS-HU-31; decisión del PO del 09-11-2026): uno por pareja con el historial de todas
// sus reservas, abierto aunque una se cancele, con buscador por palabras y eliminación solo para quien lo pide. Para el
// usuario vive en /mensajes y para el profesional en /profesional/mensajes; en celular se ve una de las dos partes a la vez.
export default function Mensajes() {
  const { sesion } = useSesion();
  const profesional = sesion.usuario.rol === 'profesional';
  const base = profesional ? '/profesional/mensajes' : '/mensajes';
  const { id } = useParams();
  const [parametros] = useSearchParams();
  const navegar = useNavigate();
  const chatId = /^\d+$/.test(id || '') ? Number(id) : null;
  const [revision, setRevision] = useState(0);
  const [aviso, setAviso] = useState('');
  const errorReserva = useAbrirDesdeReserva(parametros.get('reserva'), base);
  const lista = useConsultaPeriodica('/chats', revision);
  const abierto = useConsultaPeriodica(chatId ? `/chats/${chatId}` : null, revision);

  useEffect(() => { if (id && !chatId) navegar(base, { replace: true }); }, [id, chatId, base, navegar]);

  function eliminado() {
    setAviso(`Eliminaste el chat con ${abierto.datos.chat.con.nombre}.`);
    navegar(base);
    setRevision((r) => r + 1);
  }

  return (
    <div className="mensajes-pagina">
      <div className={`mensajes${chatId || parametros.get('reserva') ? ' mensajes--con-hilo' : ''}`}>
        <section className="mensajes__panel mensajes__bandeja" aria-labelledby="titulo-mensajes">
          <h1 id="titulo-mensajes">Mensajes</h1>
          {aviso && !chatId && <Alerta tipo="exito">{aviso}</Alerta>}
          {lista.error && !lista.datos ? <Alerta>{lista.error.message}</Alerta>
            : !lista.datos ? <p className="texto-secundario" role="status">Cargando chats…</p>
              : <Bandeja base={base} chats={lista.datos.chats} activo={chatId} profesional={profesional} onElegir={() => setAviso('')} />}
        </section>
        <section className="mensajes__panel mensajes__conversacion" aria-label="Chat">
          {errorReserva ? (
            <div className="mensajes__elige">
              <Alerta>{errorReserva}</Alerta>
              <Link to={base} className="boton boton--secundario boton--compacto">Ver mis chats</Link>
            </div>
          ) : !chatId ? (
            <div className="mensajes__elige">
              <Icono nombre="chat" tamano={40} />
              <p>{parametros.get('reserva') ? 'Abriendo el chat…' : 'Elige un chat para leerlo y responder.'}</p>
            </div>
          ) : abierto.error && !abierto.datos ? (
            <div className="mensajes__elige">
              <Alerta>{abierto.error.estado === 404 ? 'No encontramos este chat.' : abierto.error.message}</Alerta>
              <Link to={base} className="boton boton--secundario boton--compacto">Ver mis chats</Link>
            </div>
          ) : !abierto.datos ? (
            <p className="texto-secundario mensajes__cargando" role="status">Cargando chat…</p>
          ) : (
            <ChatAbierto key={chatId} base={base} datos={abierto.datos} profesional={profesional}
              onEnviado={() => setRevision((r) => r + 1)} onEliminado={eliminado} />
          )}
        </section>
      </div>
    </div>
  );
}

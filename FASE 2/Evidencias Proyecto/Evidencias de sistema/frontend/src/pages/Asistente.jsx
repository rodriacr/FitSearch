import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import reglas from '@shared/reglas.json';
import Alerta from '../components/Alerta.jsx';
import Icono from '../components/Icono.jsx';
import { useSesion } from '../context/SesionContext.jsx';
import {
  ACCIONES, bloquesDe, CATEGORIAS, CONSEJOS, enlaceProfesionales, fechaCorta, horaDe, nombreProfesionales, SUGERENCIAS,
} from '../services/asistente.js';
import {
  abrirConversacion, eliminarConversacion, enviarMensaje, fijarConversacion, iniciarConversacion, listarConversaciones,
  obtenerEstadoAsistente,
} from '../services/asistente.service.js';
import { primerNombre } from '../services/formato.js';
import './Asistente.css';

const { mensaje: { max: MAX_MENSAJE } } = reglas.asistente;
const RECIENTES_VISIBLES = 6;
const ordenar = (lista) => [...lista].sort((a, b) => Number(b.fijada) - Number(a.fijada)
  || Date.parse(b.fechaActualizacion) - Date.parse(a.fechaActualizacion) || b.id - a.id);
const resumir = (texto) => (texto.length > reglas.asistente.vistaPrevia.max ? `${texto.slice(0, reglas.asistente.vistaPrevia.max - 1)}…` : texto);

// Respuesta del asistente: párrafos y listas como texto (nunca se inserta HTML).
function Contenido({ texto }) {
  return bloquesDe(texto).map((bloque, i) => (bloque.tipo === 'lista'
    ? <ul key={i}>{bloque.items.map((item, j) => <li key={j}>{item}</li>)}</ul>
    : <p key={i}>{bloque.lineas.join('\n')}</p>));
}

// FS-HU-08: especialidad que recomendó el asistente y acceso al buscador con ese filtro.
function Recomendacion({ especialidad }) {
  return (
    <div className="recomendacion-ia">
      <span className="recomendacion-ia__icono" aria-hidden="true"><Icono nombre="profesional" tamano={20} /></span>
      <p className="recomendacion-ia__texto">Te recomendamos consultar con: <strong>{especialidad}</strong></p>
      <Link to={enlaceProfesionales(especialidad)} className="boton boton--secundario boton--compacto recomendacion-ia__boton">
        Ver {nombreProfesionales(especialidad)} <Icono nombre="flecha" tamano={16} />
      </Link>
    </div>
  );
}

function Burbuja({ remitente, contenido, especialidad = null, fecha, pendiente = false }) {
  const esAsistente = remitente === 'asistente';
  return (
    <li className={`burbuja burbuja--${remitente}${pendiente ? ' burbuja--pendiente' : ''}`}>
      {esAsistente && <span className="burbuja__avatar" aria-hidden="true"><Icono nombre="robot" tamano={18} /></span>}
      <div className="burbuja__cuerpo">
        <span className="solo-lector">{esAsistente ? 'Asistente: ' : 'Tú: '}</span>
        {esAsistente ? <Contenido texto={contenido} /> : <p>{contenido}</p>}
        {esAsistente && especialidad && <Recomendacion especialidad={especialidad} />}
        {fecha && <time className="burbuja__hora" dateTime={fecha}>{horaDe(fecha)}</time>}
        {pendiente && <span className="burbuja__hora">Enviando…</span>}
      </div>
    </li>
  );
}

function ItemConversacion({ conversacion, activa, ahora }) {
  return (
    <li>
      <Link to={`/asistente/${conversacion.id}`} className={`conversacion-item${activa ? ' conversacion-item--activa' : ''}`}
        aria-current={activa ? 'page' : undefined}>
        <span className="conversacion-item__icono" aria-hidden="true"><Icono nombre={conversacion.fijada ? 'chincheta' : 'chat'} tamano={18} /></span>
        <span className="conversacion-item__texto">
          <span className="conversacion-item__titulo">{conversacion.titulo}</span>
          {conversacion.vistaPrevia && <span className="conversacion-item__vista">{conversacion.vistaPrevia}</span>}
        </span>
        <span className="conversacion-item__fecha">{fechaCorta(conversacion.fechaActualizacion, ahora)}</span>
      </Link>
    </li>
  );
}

// Asistente IA del usuario (FS-HU-07, DAS D33), según el mockup del PO: historial a la izquierda (fijadas y recientes),
// chat al centro y sugerencias, categorías y consejos a la derecha. En el celular, la lista y el chat son vistas separadas
// (/asistente y /asistente/:id), así el botón Atrás del teléfono vuelve a la lista. El banner «¿Necesitas una
// recomendación?» abre /asistente/nuevo?inicio=profesional con la pregunta para que recomiende un profesional (FS-HU-08).
export default function Asistente() {
  const { id } = useParams();
  const [parametros] = useSearchParams();
  const { key: navegacion } = useLocation();
  const navigate = useNavigate();
  const { sesion } = useSesion();
  const nombre = primerNombre(sesion.usuario.nombre);
  const conversacionId = id && id !== 'nuevo' ? Number(id) : null;
  const [ahora] = useState(() => new Date());

  const [estado, setEstado] = useState(null);
  const [historial, setHistorial] = useState(null);
  const [abiertas, setAbiertas] = useState({});
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(null);
  const [error, setError] = useState('');
  const [verTodas, setVerTodas] = useState(false);
  const [confirmarBorrado, setConfirmarBorrado] = useState(false);
  const [consejo, setConsejo] = useState(0);
  const campo = useRef(null);
  const lista = useRef(null);

  useEffect(() => {
    let activo = true;
    obtenerEstadoAsistente().then((datos) => activo && setEstado(datos)).catch(() => activo && setEstado({ error: true }));
    listarConversaciones().then(({ conversaciones }) => activo && setHistorial({ conversaciones }))
      .catch((e) => activo && setHistorial({ error: e.message }));
    return () => { activo = false; };
  }, []);

  const actual = conversacionId ? abiertas[conversacionId] : null;
  useEffect(() => {
    if (!conversacionId || abiertas[conversacionId]) return undefined;
    let activo = true;
    abrirConversacion(conversacionId)
      .then((datos) => activo && setAbiertas((previas) => ({ ...previas, [conversacionId]: datos })))
      .catch((e) => activo && setAbiertas((previas) => ({ ...previas, [conversacionId]: { error: e.message } })));
    return () => { activo = false; };
  }, [conversacionId, abiertas]);

  // Al llegar un mensaje, la conversación baja hasta el final.
  const cantidad = actual?.mensajes?.length ?? 0;
  useEffect(() => {
    if (lista.current) lista.current.scrollTop = lista.current.scrollHeight;
  }, [cantidad, enviando, conversacionId]);

  const restantes = estado?.restantesHoy;
  const sinCupo = restantes === 0;
  const actualizarHistorial = (cambio) => setHistorial((previo) => (previo?.conversaciones ? { conversaciones: ordenar(cambio(previo.conversaciones)) } : previo));

  const enfocar = () => requestAnimationFrame(() => {
    const el = campo.current;
    if (!el) return;
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
  });

  // Desde el banner llega con ?inicio=profesional: la pregunta queda escrita y el cursor al final para terminarla. Se
  // atiende una vez por navegación (cada clic), también si la pantalla del asistente ya estaba abierta.
  const pidePregunta = parametros.get('inicio') === 'profesional';
  const [navegacionAtendida, setNavegacionAtendida] = useState(null);
  if (pidePregunta && navegacionAtendida !== navegacion) {
    setNavegacionAtendida(navegacion);
    setTexto(ACCIONES.find((accion) => accion.icono === 'profesional').inicio);
  }
  useEffect(() => {
    if (pidePregunta) enfocar();
  }, [pidePregunta, navegacion]);

  // Tarjetas de acción y categorías: completan el comienzo de la pregunta y llevan al chat.
  function usarInicio(inicio) {
    setTexto(inicio);
    setError('');
    if (!id) navigate('/asistente/nuevo');
    enfocar();
  }

  async function enviar(contenido) {
    const limpio = contenido.trim();
    if (!limpio || enviando || sinCupo) return;
    setError('');
    setEnviando(limpio);
    setTexto('');
    try {
      if (conversacionId) {
        const { mensajes, restantesHoy } = await enviarMensaje(conversacionId, limpio);
        setAbiertas((previas) => ({ ...previas, [conversacionId]: { ...previas[conversacionId], mensajes: [...previas[conversacionId].mensajes, ...mensajes] } }));
        actualizarHistorial((conversaciones) => conversaciones.map((c) => (c.id === conversacionId
          ? { ...c, fechaActualizacion: mensajes.at(-1).fecha, vistaPrevia: resumir(mensajes.at(-1).contenido) } : c)));
        setEstado((previo) => ({ ...previo, restantesHoy }));
      } else {
        const { conversacion, mensajes, restantesHoy } = await iniciarConversacion(limpio);
        setAbiertas((previas) => ({ ...previas, [conversacion.id]: { conversacion, mensajes } }));
        actualizarHistorial((conversaciones) => [{ ...conversacion, vistaPrevia: resumir(mensajes.at(-1).contenido) }, ...conversaciones]);
        setEstado((previo) => ({ ...previo, restantesHoy }));
        navigate(`/asistente/${conversacion.id}`, { replace: id === 'nuevo' });
      }
    } catch (e) {
      // El mensaje no se guardó: vuelve al campo para reintentar.
      setTexto(limpio);
      setError(e.message);
      if (e.estado === 429) setEstado((previo) => ({ ...previo, restantesHoy: 0 }));
    } finally {
      setEnviando(null);
      enfocar();
    }
  }

  async function alternarFijada() {
    const { conversacion } = actual;
    setError('');
    try {
      const { conversacion: cambiada } = await fijarConversacion(conversacion.id, !conversacion.fijada);
      setAbiertas((previas) => ({ ...previas, [conversacion.id]: { ...previas[conversacion.id], conversacion: { ...conversacion, fijada: cambiada.fijada } } }));
      actualizarHistorial((conversaciones) => conversaciones.map((c) => (c.id === conversacion.id ? { ...c, fijada: cambiada.fijada } : c)));
    } catch (e) {
      setError(e.message);
    }
  }

  async function borrar() {
    const borradaId = conversacionId;
    setError('');
    try {
      await eliminarConversacion(borradaId);
      setConfirmarBorrado(false);
      actualizarHistorial((conversaciones) => conversaciones.filter((c) => c.id !== borradaId));
      navigate('/asistente', { replace: true });
    } catch (e) {
      setError(e.message);
    }
  }

  const conversaciones = historial?.conversaciones ?? [];
  const fijadas = conversaciones.filter((c) => c.fijada);
  const recientes = conversaciones.filter((c) => !c.fijada);
  const recientesVisibles = verTodas ? recientes : recientes.slice(0, RECIENTES_VISIBLES);
  const mensajes = actual?.mensajes ?? [];

  return (
    <div className={`chat-ia${id ? ' chat-ia--en-chat' : ''}`}>
      <h1 className="solo-lector">Asistente IA</h1>

      <aside className="chat-ia__lateral" aria-label="Tus conversaciones">
        <Link to="/asistente/nuevo" className="boton boton--principal chat-ia__nuevo" onClick={() => setError('')}>
          <Icono nombre="mas" tamano={20} /> Nuevo chat
        </Link>
        {historial?.error && <Alerta>{historial.error}</Alerta>}
        {fijadas.length > 0 && (
          <section className="chat-ia__bloque" aria-labelledby="titulo-fijados">
            <h2 id="titulo-fijados" className="chat-ia__subtitulo"><Icono nombre="chincheta" tamano={16} /> Chats fijados</h2>
            <ul className="chat-ia__conversaciones">
              {fijadas.map((c) => <ItemConversacion key={c.id} conversacion={c} activa={c.id === conversacionId} ahora={ahora} />)}
            </ul>
          </section>
        )}
        <section className="chat-ia__bloque" aria-labelledby="titulo-recientes">
          <h2 id="titulo-recientes" className="chat-ia__subtitulo"><Icono nombre="reloj" tamano={16} /> Chats recientes</h2>
          {historial && !historial.error && !recientes.length && (
            <p className="chat-ia__vacio">{fijadas.length ? 'Tus otras conversaciones aparecerán aquí.' : 'Aún no tienes conversaciones. Empieza con una pregunta.'}</p>
          )}
          {!historial && <p className="chat-ia__vacio" role="status">Cargando tus conversaciones…</p>}
          <ul className="chat-ia__conversaciones">
            {recientesVisibles.map((c) => <ItemConversacion key={c.id} conversacion={c} activa={c.id === conversacionId} ahora={ahora} />)}
          </ul>
          {recientes.length > RECIENTES_VISIBLES && (
            <button type="button" className="boton-texto chat-ia__ver-todos" aria-expanded={verTodas} onClick={() => setVerTodas(!verTodas)}>
              {verTodas ? 'Ver menos' : `Ver todos (${recientes.length})`}
            </button>
          )}
        </section>
      </aside>

      <section className="chat-ia__centro" aria-label={actual?.conversacion ? `Conversación: ${actual.conversacion.titulo}` : 'Nueva conversación'}>
        {conversacionId ? (
          <header className="chat-ia__cabecera">
            <Link to="/asistente" className="chat-ia__volver" aria-label="Volver a tus conversaciones"><Icono nombre="flechaIzquierda" tamano={20} /></Link>
            <h2 className="chat-ia__titulo-chat">{actual?.conversacion?.titulo ?? 'Conversación'}</h2>
            {actual?.conversacion && (
              <div className="chat-ia__acciones-chat">
                <button type="button" className="boton-icono" aria-pressed={actual.conversacion.fijada} onClick={alternarFijada}
                  aria-label={actual.conversacion.fijada ? 'Desfijar conversación' : 'Fijar conversación'} title={actual.conversacion.fijada ? 'Desfijar' : 'Fijar'}>
                  <Icono nombre="chincheta" tamano={20} relleno={actual.conversacion.fijada} />
                </button>
                <button type="button" className="boton-icono" aria-label="Borrar conversación" title="Borrar" onClick={() => setConfirmarBorrado(true)}>
                  <Icono nombre="basura" tamano={20} />
                </button>
              </div>
            )}
          </header>
        ) : (
          <div className="chat-ia__bienvenida">
            <div className="chat-ia__presentacion">
              <span className="chat-ia__robot" aria-hidden="true"><Icono nombre="robot" tamano={44} /></span>
              <div>
                <h2 className="chat-ia__hola">¡Hola, {nombre}! <span aria-hidden="true">👋</span></h2>
                <p>Soy tu asistente de FitSearch y estoy aquí para ayudarte con tu salud, el deporte y tu bienestar.</p>
                {estado?.modo === 'simulado' && (
                  <p className="chat-ia__modo"><Icono nombre="info" tamano={16} /> Modo de prueba: las respuestas son de ejemplo hasta que se configure el proveedor de IA.</p>
                )}
              </div>
            </div>
            <ul className="chat-ia__acciones">
              {ACCIONES.map((accion) => (
                <li key={accion.titulo}>
                  <button type="button" className="tarjeta-accion" onClick={() => usarInicio(accion.inicio)}>
                    <Icono nombre={accion.icono} tamano={24} /> {accion.titulo}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {confirmarBorrado && conversacionId && (
          <div className="chat-ia__confirmacion" role="alertdialog" aria-labelledby="texto-borrar">
            <p id="texto-borrar">¿Borrar esta conversación? No podrás recuperarla.</p>
            <button type="button" className="boton boton--compacto chat-ia__borrar" onClick={borrar}>Borrar</button>
            <button type="button" className="boton-texto" onClick={() => setConfirmarBorrado(false)}>Cancelar</button>
          </div>
        )}

        <div className="chat-ia__mensajes" ref={lista}>
          {actual?.error ? (
            <div className="chat-ia__estado">
              <Alerta>{actual.error}</Alerta>
              <Link to="/asistente" className="boton boton--secundario boton--compacto">Ir a tus conversaciones</Link>
            </div>
          ) : (
            <ol className="chat-ia__lista" role="log" aria-label="Mensajes de la conversación" aria-live="polite">
              {!conversacionId && <Burbuja remitente="asistente" contenido={`Hola, ${nombre}. ¿En qué puedo ayudarte hoy?`} />}
              {conversacionId && !actual && <li className="chat-ia__vacio" role="status">Cargando la conversación…</li>}
              {mensajes.map((m) => <Burbuja key={m.id} {...m} />)}
              {enviando && <Burbuja remitente="usuario" contenido={enviando} pendiente />}
            </ol>
          )}
          {enviando && <p className="chat-ia__escribiendo" role="status"><span aria-hidden="true" className="chat-ia__puntos" /> El asistente está escribiendo…</p>}
          {!conversacionId && (
            <ul className="chat-ia__sugerencias-chat" aria-label="Sugerencias rápidas">
              {SUGERENCIAS.slice(0, 3).map((sugerencia) => (
                <li key={sugerencia}><button type="button" className="chip-sugerencia" disabled={Boolean(enviando) || sinCupo} onClick={() => enviar(sugerencia)}>{sugerencia}</button></li>
              ))}
            </ul>
          )}
        </div>

        <form className="chat-ia__compositor" onSubmit={(evento) => { evento.preventDefault(); enviar(texto); }}>
          <Alerta>{error}</Alerta>
          <div className="chat-ia__campo">
            <label htmlFor="mensaje-asistente" className="solo-lector">Escribe tu mensaje</label>
            <textarea id="mensaje-asistente" ref={campo} rows={1} maxLength={MAX_MENSAJE} value={texto} disabled={sinCupo}
              placeholder={sinCupo ? 'Llegaste al límite de mensajes de hoy' : 'Escribe tu mensaje aquí…'}
              aria-describedby="ayuda-asistente aviso-asistente"
              onChange={(evento) => setTexto(evento.target.value)}
              onKeyDown={(evento) => {
                if (evento.key === 'Enter' && !evento.shiftKey && !evento.nativeEvent.isComposing) {
                  evento.preventDefault();
                  enviar(texto);
                }
              }} />
            <button type="submit" className="chat-ia__enviar" aria-label="Enviar mensaje" disabled={!texto.trim() || Boolean(enviando) || sinCupo}>
              <Icono nombre="enviar" tamano={20} />
            </button>
          </div>
          <p id="ayuda-asistente" className="chat-ia__ayuda">
            <span>{restantes === undefined ? '' : sinCupo ? 'Llegaste al límite de mensajes de hoy. Vuelve mañana.' : (restantes === 1 ? 'Te queda 1 mensaje hoy' : `Te quedan ${restantes} mensajes hoy`)}</span>
            <span>{texto.length}/{MAX_MENSAJE}</span>
          </p>
          <p id="aviso-asistente" className="chat-ia__aviso">
            Orientación general: no reemplaza a un profesional de salud. Lo que escribes se procesa con un servicio de IA externo; no incluyas datos que te identifiquen.
          </p>
        </form>
      </section>

      <aside className="chat-ia__extra" aria-label="Sugerencias y categorías">
        <section className="chat-ia__bloque" aria-labelledby="titulo-sugerencias">
          <h2 id="titulo-sugerencias" className="chat-ia__subtitulo"><Icono nombre="rayo" tamano={16} /> Sugerencias rápidas</h2>
          <ul className="chat-ia__sugerencias">
            {SUGERENCIAS.map((sugerencia) => (
              <li key={sugerencia}>
                <button type="button" className="sugerencia" disabled={Boolean(enviando) || sinCupo} onClick={() => enviar(sugerencia)}>
                  {sugerencia} <Icono nombre="flecha" tamano={16} />
                </button>
              </li>
            ))}
          </ul>
        </section>
        <section className="chat-ia__bloque" aria-labelledby="titulo-categorias">
          <h2 id="titulo-categorias" className="chat-ia__subtitulo"><Icono nombre="diana" tamano={16} /> Categorías</h2>
          <ul className="chat-ia__categorias">
            {CATEGORIAS.map((categoria) => (
              <li key={categoria.nombre}>
                <button type="button" className="categoria" onClick={() => usarInicio(categoria.inicio)}>
                  <span className="categoria__icono" aria-hidden="true"><Icono nombre={categoria.icono} tamano={22} /></span>
                  {categoria.nombre}
                </button>
              </li>
            ))}
          </ul>
        </section>
        <section className="chat-ia__consejo" aria-labelledby="titulo-consejo">
          <span className="chat-ia__consejo-icono" aria-hidden="true"><Icono nombre="info" tamano={22} /></span>
          <div>
            <h2 id="titulo-consejo">¿Sabías que…?</h2>
            <p aria-live="polite">{CONSEJOS[consejo]}</p>
            <button type="button" className="boton boton--secundario boton--compacto" onClick={() => setConsejo((consejo + 1) % CONSEJOS.length)}>Otro consejo</button>
          </div>
        </section>
        <p className="chat-ia__lema">Tu bienestar, nuestra prioridad.</p>
      </aside>
    </div>
  );
}

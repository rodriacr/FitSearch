import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import reglas from '@shared/reglas.json';
import Alerta from '../Alerta.jsx';
import Avatar from '../Avatar.jsx';
import { Calificacion } from '../Calificacion.jsx';
import Icono from '../Icono.jsx';
import { Opciones } from '../reservas/ReservarHora.jsx';
import { diaCorto } from '../agenda/semana.js';
import { solicitar } from '../../services/api.js';
import { fechaLarga } from '../../services/agenda.js';
import { etiquetaModalidad, formatearKm, primerNombre } from '../../services/formato.js';
import { enlaceProfesionales, nombreProfesionales } from '../../services/asistente.js';
import { obtenerUbicacion, ubicacionSiHayPermiso } from '../../services/ubicacion.js';
import '../reservas/ReservarHora.css';
import '../profesionales/TarjetaProfesional.css';
import './MejorasAsistente.css';

// Profesionales reales que recomienda el asistente (SC-47), en vez de solo mandar al buscador. Si la persona no dijo
// cómo quiere atenderse, primero se le pregunta: presencial muestra los más cercanos y online, los mejor evaluados.
// Si no hay cercanos, se la lleva al buscador con el filtro, como antes. Los profesionales salen de la base de datos
// (GET /api/profesionales): la IA no los conoce ni los inventa. La ubicación se pide solo para «Más cerca» y queda en
// la memoria del navegador (DAS, D23).
const { cantidad: CANTIDAD, distanciaCercaKm: CERCA_KM, modalidades: MODALIDADES, criterios: CRITERIOS } = reglas.asistente.recomendacion;
const criterioDe = (modalidad) => MODALIDADES.find((m) => m.valor === modalidad)?.criterio ?? 'calificacion';
const valeCriterio = (criterio, modalidad) => Boolean(criterio) && !(criterio === 'cercania' && modalidad === 'online');
const MENSAJE = { min: 10, max: 500 };

// Reserva sin salir del chat: una de las próximas horas libres, el mensaje (obligatorio) y si es la primera visita. La
// reserva queda hecha recién cuando la persona confirma, con las mismas reglas que en la ficha.
function ReservaRapida({ profesional, pregunta, modalidadPreferida, onCambio }) {
  const { id, nombre, modalidad, proximasHoras = [] } = profesional;
  const sugerido = pregunta && pregunta.trim().length >= MENSAJE.min && pregunta.trim().length <= MENSAJE.max ? pregunta.trim() : '';
  const [hora, setHora] = useState(null);
  const [mensaje, setMensaje] = useState(sugerido);
  const [primeraVisita, setPrimeraVisita] = useState(null);
  const [modalidadElegida, setModalidadElegida] = useState(modalidad === 'ambas' ? modalidadPreferida : null);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState('');
  const [enviada, setEnviada] = useState(null);
  const titulo = useRef(null);
  useEffect(() => { if (enviada) titulo.current?.focus(); }, [enviada]);

  if (enviada) {
    return (
      <div className="reserva-ia reserva-ia--enviada" aria-live="polite">
        <p ref={titulo} tabIndex={-1} className="reserva-ia__titulo"><Icono nombre="check" tamano={18} /> Solicitud enviada</p>
        <p>{fechaLarga(enviada.fecha)} · {enviada.horaInicio}. {enviada.estado === 'confirmada'
          ? `${primerNombre(nombre)} confirma sus reservas al instante.`
          : `Queda pendiente hasta que ${primerNombre(nombre)} la confirme; te avisaremos por correo.`}</p>
        <Link to="/citas" className="boton boton--secundario boton--compacto">Ver en Mis citas <Icono nombre="flecha" tamano={16} /></Link>
      </div>
    );
  }
  if (!proximasHoras.length) {
    return (
      <div className="reserva-ia">
        <p>{primerNombre(nombre)} no tiene horas libres en los próximos días.</p>
        <Link to={`/profesionales/${id}`} className="boton-texto">Ver su ficha y avisarme si se libera una hora</Link>
      </div>
    );
  }
  async function confirmar(evento) {
    evento.preventDefault();
    setOcupado(true);
    setError('');
    try {
      const { reserva } = await solicitar('/reservas', {
        metodo: 'POST',
        cuerpo: { disponibilidadId: hora.id, mensaje: mensaje.trim(), primeraVisita, ...(modalidad === 'ambas' && { modalidad: modalidadElegida }) },
      });
      setEnviada({ ...hora, estado: reserva?.estado });
    } catch (e) {
      setError(e.message);
      // Otra persona tomó la hora: se vuelven a pedir las horas libres.
      if (e.estado === 409 && e.detalles?.motivo !== 'limite_por_profesional') {
        setHora(null);
        onCambio?.();
      }
    } finally {
      setOcupado(false);
    }
  }
  const largo = mensaje.trim().length;
  return (
    <form className="reserva-ia" onSubmit={confirmar} aria-label={`Reservar con ${nombre}`}>
      <p className="reserva-ia__titulo">Elige una hora</p>
      <ul className="reserva-ia__horas">
        {proximasHoras.map((h) => (
          <li key={h.id}>
            <button type="button" className="hora-rapida" aria-pressed={hora?.id === h.id} onClick={() => setHora(h)}
              aria-label={`${diaCorto(h.fecha)} a las ${h.horaInicio}`}>
              <span>{diaCorto(h.fecha).split(' ').slice(0, 2).join(' ')}</span><strong>{h.horaInicio}</strong>
            </button>
          </li>
        ))}
      </ul>
      {hora && (
        <>
          <label className="campo">
            <span className="campo__etiqueta">Cuéntale brevemente qué necesitas</span>
            <textarea className="campo__control campo__control--area" rows={3} minLength={MENSAJE.min} maxLength={MENSAJE.max} value={mensaje} required
              onChange={(e) => setMensaje(e.target.value)} aria-describedby={`ayuda-reserva-ia-${id}`} />
          </label>
          <p id={`ayuda-reserva-ia-${id}`} className="campo__ayuda">Entre {MENSAJE.min} y {MENSAJE.max} caracteres ({largo}/{MENSAJE.max}). Solo lo verán tú y el profesional.</p>
          <Opciones nombre={`primera-ia-${id}`} leyenda="¿Es tu primera visita?" valor={primeraVisita} onCambiar={setPrimeraVisita}
            opciones={[[true, 'Sí'], [false, 'No']]} />
          {modalidad === 'ambas' && (
            <Opciones nombre={`modalidad-ia-${id}`} leyenda="¿Cómo quieres atenderte?" valor={modalidadElegida} onCambiar={setModalidadElegida}
              opciones={[['presencial', 'Presencial'], ['online', 'Online']]} />
          )}
          <Alerta>{error}</Alerta>
          <div className="reserva-ia__acciones">
            <button type="submit" className="boton boton--principal boton--compacto"
              disabled={ocupado || largo < MENSAJE.min || primeraVisita === null || (modalidad === 'ambas' && !modalidadElegida)}>
              {ocupado ? 'Reservando…' : `Confirmar ${diaCorto(hora.fecha)}, ${hora.horaInicio}`}
            </button>
            <button type="button" className="boton-texto" onClick={() => setHora(null)}>Elegir otra hora</button>
          </div>
        </>
      )}
      {!hora && <Alerta>{error}</Alerta>}
    </form>
  );
}

function ProfesionalRecomendado({ profesional, destacado, pregunta, modalidad, onCambio }) {
  const { id, nombre, especialidad, verificado, calificacion, distanciaKm, comuna, proximaHora } = profesional;
  const [reservando, setReservando] = useState(false);
  const lugar = profesional.modalidad === 'online' || modalidad === 'online'
    ? etiquetaModalidad(profesional.modalidad)
    : [comuna, distanciaKm != null && `a ${formatearKm(distanciaKm)}`].filter(Boolean).join(' · ') || etiquetaModalidad(profesional.modalidad);
  return (
    <li className={`profesional-ia${destacado ? ' profesional-ia--destacado' : ''}`}>
      <div className="profesional-ia__fila">
        <Avatar className="profesional-ia__foto" nombre={nombre} fotoUrl={profesional.fotoUrl} />
        <div className="profesional-ia__datos">
          {destacado && <span className="profesional-ia__etiqueta">Mi primera opción</span>}
          <p className="profesional-ia__nombre">
            <Link to={`/profesionales/${id}`}>{nombre}</Link>
            {verificado && <span className="profesional-ia__verificado"><Icono nombre="escudo" tamano={14} /> Verificado</span>}
          </p>
          <p className="profesional-ia__linea"><span className="solo-lector">{especialidad}. </span><Calificacion promedio={calificacion.promedio} total={calificacion.total} /></p>
          <p className="profesional-ia__linea"><Icono nombre="pin" tamano={14} /> {lugar}</p>
          <p className="profesional-ia__linea">
            <Icono nombre="calendario" tamano={14} /> {proximaHora ? <>Próxima hora: <strong>{diaCorto(proximaHora.fecha)}, {proximaHora.horaInicio}</strong></> : 'Sin horas libres por ahora'}
          </p>
        </div>
      </div>
      <div className="profesional-ia__acciones">
        <Link to={`/profesionales/${id}`} className="boton boton--secundario boton--compacto">Ver ficha</Link>
        <button type="button" className="boton boton--principal boton--compacto" aria-expanded={reservando} onClick={() => setReservando(!reservando)}>
          <Icono nombre="calendario" tamano={16} /> {reservando ? 'Cerrar reserva' : 'Reservar'}
        </button>
      </div>
      {reservando && <ReservaRapida profesional={profesional} pregunta={pregunta} modalidadPreferida={modalidad} onCambio={onCambio} />}
    </li>
  );
}

// mensaje: la respuesta del asistente con { id, especialidad, modalidad, criterio }. pregunta: lo que escribió la persona
// (sugiere el mensaje de la reserva). onElegir(id, cambios): guarda la modalidad y el orden elegidos.
export default function RecomendacionProfesionales({ mensaje, pregunta = '', onElegir }) {
  const { id, especialidad } = mensaje;
  const [modalidad, setModalidad] = useState(mensaje.modalidad ?? null);
  const [criterio, setCriterio] = useState(valeCriterio(mensaje.criterio, mensaje.modalidad) ? mensaje.criterio : null);
  const [conHoraHoy, setConHoraHoy] = useState(false);
  const [ubicacion, setUbicacion] = useState({ estado: 'sin', coords: null });
  const [resultado, setResultado] = useState(null);
  const [revision, setRevision] = useState(0);
  const orden = modalidad ? (valeCriterio(criterio, modalidad) ? criterio : criterioDe(modalidad)) : null;
  const plural = nombreProfesionales(especialidad);

  // Si la persona ya dio permiso de ubicación antes, se usa sin volver a preguntar (también para mostrar distancias).
  useEffect(() => {
    let activo = true;
    if (modalidad === 'presencial' && ubicacion.estado === 'sin') {
      ubicacionSiHayPermiso().then((coords) => activo && coords && setUbicacion({ estado: 'lista', coords }));
    }
    return () => { activo = false; };
  }, [modalidad, ubicacion.estado]);

  const necesitaUbicacion = modalidad === 'presencial' && orden === 'cercania' && !ubicacion.coords;
  // Consulta al buscador con la modalidad, el orden y la ubicación elegidos. El resultado guarda la consulta que lo
  // produjo: mientras no coincide con la actual, la tarjeta muestra «Buscando…».
  let consulta = null;
  if (modalidad && !necesitaUbicacion) {
    const parametros = new URLSearchParams({ especialidad, modalidad, limite: String(CANTIDAD), orden: orden === 'cercania' ? 'cercania' : 'calificacion' });
    if (orden === 'verificados') parametros.set('verificado', 'true');
    if (modalidad === 'presencial' && ubicacion.coords) {
      parametros.set('lat', String(ubicacion.coords.lat));
      parametros.set('lng', String(ubicacion.coords.lng));
      if (orden === 'cercania') parametros.set('distanciaKm', String(CERCA_KM));
    }
    if (conHoraHoy) parametros.set('disponible', 'hoy');
    consulta = `/profesionales?${parametros}`;
  }
  const clave = consulta && `${consulta}#${revision}`;
  useEffect(() => {
    if (!clave) return undefined;
    let activo = true;
    solicitar(clave.split('#')[0])
      .then(({ profesionales }) => activo && setResultado({ clave, profesionales }))
      .catch((e) => activo && setResultado({ clave, error: e.message }));
    return () => { activo = false; };
  }, [clave]);
  const vigente = resultado?.clave === clave ? resultado : null;

  const guardar = (cambios) => { onElegir?.(id, cambios); };
  async function pedirUbicacion() {
    setUbicacion({ estado: 'pidiendo', coords: null });
    try {
      setUbicacion({ estado: 'lista', coords: await obtenerUbicacion() });
    } catch (e) {
      setUbicacion({ estado: e.motivo === 'denegada' ? 'denegada' : 'no-disponible', coords: null });
    }
  }
  function elegirModalidad(valor) {
    setModalidad(valor);
    const siguiente = valeCriterio(criterio, valor) ? criterio : null;
    setCriterio(siguiente);
    guardar({ modalidad: valor, criterio: siguiente ?? criterioDe(valor) });
    // Presencial ordena por cercanía: el toque en el botón pide la ubicación (el navegador muestra su aviso).
    if (valor === 'presencial' && (siguiente ?? criterioDe(valor)) === 'cercania' && !ubicacion.coords) pedirUbicacion();
  }
  function elegirCriterio(valor) {
    setCriterio(valor);
    guardar({ criterio: valor });
    if (valor === 'cercania' && !ubicacion.coords) pedirUbicacion();
  }

  const buscador = `${enlaceProfesionales(especialidad)}${modalidad ? `&modalidad=${modalidad}` : ''}`;
  const otra = modalidad === 'online' ? 'presencial' : 'online';
  const lista = vigente?.profesionales ?? [];

  let cuerpo;
  if (!modalidad) {
    cuerpo = (
      <div className="recomendacion-ia__pregunta" role="group" aria-labelledby={`pregunta-modalidad-${id}`}>
        <p id={`pregunta-modalidad-${id}`}>¿Cómo prefieres atenderte?</p>
        <div className="recomendacion-ia__modalidades">
          <button type="button" className="opcion-ia" onClick={() => elegirModalidad('presencial')}>
            <Icono nombre="pin" tamano={20} /><span><strong>Presencial</strong><small>Te muestro los más cercanos a ti</small></span>
          </button>
          <button type="button" className="opcion-ia" onClick={() => elegirModalidad('online')}>
            <Icono nombre="chat" tamano={20} /><span><strong>Online</strong><small>Te muestro los mejor evaluados</small></span>
          </button>
        </div>
      </div>
    );
  } else if (necesitaUbicacion) {
    const negada = ubicacion.estado === 'denegada' || ubicacion.estado === 'no-disponible';
    cuerpo = (
      <div className="recomendacion-ia__aviso" aria-live="polite">
        {negada ? (
          <>
            <p>{ubicacion.estado === 'denegada' ? 'Sin permiso para ver tu ubicación' : 'No pudimos obtener tu ubicación'}, no puedo buscar los más cercanos.
              En el buscador puedes elegir tu comuna o región.</p>
            <div className="recomendacion-ia__botones">
              <Link to={buscador} className="boton boton--principal boton--compacto">Ver opciones en el buscador <Icono nombre="flecha" tamano={16} /></Link>
              <button type="button" className="boton boton--secundario boton--compacto" onClick={() => elegirCriterio('calificacion')}>Ver los mejor evaluados</button>
            </div>
          </>
        ) : (
          <>
            <p>Para mostrarte los {plural} más cercanos necesito tu ubicación. Solo se usa para esta búsqueda y no se guarda.</p>
            <button type="button" className="boton boton--principal boton--compacto" disabled={ubicacion.estado === 'pidiendo'} onClick={pedirUbicacion}>
              <Icono nombre="pin" tamano={16} /> {ubicacion.estado === 'pidiendo' ? 'Buscando tu ubicación…' : 'Usar mi ubicación'}
            </button>
          </>
        )}
      </div>
    );
  } else if (!vigente) {
    cuerpo = <p className="recomendacion-ia__estado" role="status">Buscando {plural}…</p>;
  } else if (vigente.error) {
    cuerpo = <Alerta>{vigente.error}</Alerta>;
  } else if (!lista.length) {
    let texto = `Por ahora no hay ${plural} que atiendan online.`;
    if (conHoraHoy) texto = `Ninguno de los ${plural} tiene horas libres hoy.`;
    else if (orden === 'verificados') texto = `Todavía no hay ${plural} verificados${modalidad === 'online' ? ' que atiendan online' : ''}.`;
    else if (modalidad === 'presencial' && orden === 'cercania') texto = `No encontré ${plural} presenciales a menos de ${CERCA_KM} km de ti.`;
    else if (modalidad === 'presencial') texto = `Por ahora no hay ${plural} que atiendan presencial.`;
    cuerpo = (
      <div className="recomendacion-ia__aviso" aria-live="polite">
        <p>{texto} En el buscador puedes ver todas las opciones que hay.</p>
        <div className="recomendacion-ia__botones">
          <Link to={buscador} className="boton boton--principal boton--compacto">Ver opciones en el buscador <Icono nombre="flecha" tamano={16} /></Link>
          {!conHoraHoy && orden !== 'verificados' && (
            <button type="button" className="boton boton--secundario boton--compacto" onClick={() => elegirModalidad(otra)}>Ver {otra === 'online' ? 'los que atienden online' : 'los presenciales'}</button>
          )}
        </div>
      </div>
    );
  } else {
    cuerpo = (
      <ul className="recomendacion-ia__lista" aria-label={`${plural} recomendados`}>
        {lista.map((profesional, i) => (
          <ProfesionalRecomendado key={profesional.id} profesional={profesional} destacado={i === 0} pregunta={pregunta} modalidad={modalidad}
            onCambio={() => setRevision((r) => r + 1)} />
        ))}
      </ul>
    );
  }

  return (
    <section className="recomendacion-ia" aria-label={`Recomendación: ${plural}`}>
      <div className="recomendacion-ia__cabecera">
        <span className="recomendacion-ia__icono" aria-hidden="true"><Icono nombre="profesional" tamano={20} /></span>
        <p className="recomendacion-ia__texto">Te recomiendo consultar con: <strong>{especialidad}</strong></p>
      </div>
      {modalidad && (
        <div className="recomendacion-ia__opciones">
          <div className="recomendacion-ia__chips" role="group" aria-label="Qué profesionales ver primero">
            {CRITERIOS.filter((c) => !(c.soloPresencial && modalidad === 'online')).map((c) => (
              <button key={c.valor} type="button" className="chip-filtro" aria-pressed={orden === c.valor} onClick={() => elegirCriterio(c.valor)}>
                {c.etiqueta}
              </button>
            ))}
            <button type="button" className="chip-filtro" aria-pressed={conHoraHoy} onClick={() => setConHoraHoy(!conHoraHoy)}>Con hora hoy</button>
          </div>
          <p className="recomendacion-ia__modalidad">
            {etiquetaModalidad(modalidad)} · <button type="button" className="boton-texto" onClick={() => elegirModalidad(otra)}>Prefiero {otra}</button>
          </p>
        </div>
      )}
      {cuerpo}
      <Link to={buscador} className="recomendacion-ia__todos">Ver todos en el buscador <Icono nombre="flecha" tamano={14} /></Link>
    </section>
  );
}

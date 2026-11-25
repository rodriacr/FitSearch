import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import Icono from '../Icono.jsx';
import { aHora, aMinutos, describirHorario, diaLargo, diasDeSemana, ESTADOS, estadoVisible } from './semana.js';
import './CalendarioSemana.css';

// Alto de una hora en la semana (15-11-2026): se ajusta para que el día completo quepa en la pantalla, entre un mínimo
// en que todavía se distingue cada bloque y el alto cómodo de antes. Bajo el mínimo, el calendario vuelve a desplazarse.
const HORA_MINIMA = 24;
const HORA_MAXIMA = 64;
const AIRE_INFERIOR = 16;
// Según su alto en píxeles, un bloque muestra una sola línea chica (solo el nombre), una línea (hora y nombre) o dos.
const BLOQUE_MINI = 22;
const BLOQUE_CORTO = 40;

function Detalles({ h }) {
  if (!h.reserva) return null;
  return (
    <span className="horario__marcas" aria-hidden="true">
      {h.reserva.modalidad === 'online' && <Icono nombre="video" tamano={14} />}
      {h.reserva.primeraVisita && <span className="horario__primera">1.ª</span>}
    </span>
  );
}

// Alto de una hora para que la rejilla entre en lo que queda de pantalla bajo el calendario (con la página arriba del todo)
// y, si ni con el mínimo cabe, el alto máximo del calendario: se desplaza por dentro y la página queda quieta.
function useAltoHora(caja, horas) {
  const [medida, setMedida] = useState({ alto: HORA_MAXIMA, maximo: null });
  useLayoutEffect(() => {
    const elemento = caja.current;
    if (!elemento) return undefined;
    const medir = () => {
      const estilo = getComputedStyle(elemento);
      const raiz = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
      const margen = (parseFloat(estilo.getPropertyValue('--margen-rejilla')) || 0.75) * raiz;
      const cabecera = elemento.querySelector('.semana__cabecera')?.offsetHeight ?? 0;
      const arriba = elemento.getBoundingClientRect().top + window.scrollY;
      // Si el calendario empieza muy abajo (en pantallas angostas el costado va arriba), se calcula para verlo entero
      // al bajar hasta él: bajo el encabezado fijo de la aplicación.
      const encabezado = document.querySelector('.encabezado')?.offsetHeight ?? 68;
      const pantalla = window.innerHeight - (arriba > window.innerHeight * 0.45 ? encabezado + 12 : arriba) - AIRE_INFERIOR;
      const alto = Math.max(HORA_MINIMA, Math.min(HORA_MAXIMA, Math.floor((pantalla - cabecera - margen * 2 - 2) / horas)));
      const maximo = alto === HORA_MINIMA ? Math.max(320, Math.floor(pantalla)) : null;
      setMedida((antes) => (antes.alto === alto && antes.maximo === maximo ? antes : { alto, maximo }));
    };
    medir();
    // Lo que está sobre el calendario puede cambiar de alto (un aviso, la barra en dos líneas): se vuelve a medir.
    const observador = typeof ResizeObserver === 'function' ? new ResizeObserver(medir) : null;
    observador?.observe(elemento.closest('.agenda-semanal') || document.body);
    window.addEventListener('resize', medir);
    return () => {
      observador?.disconnect();
      window.removeEventListener('resize', medir);
    };
  }, [caja, horas]);
  return medida;
}

// Semana con columnas por día y una fila por hora. Cada horario es un botón ubicado según su hora; un clic en un
// espacio vacío (futuro) propone publicar un horario a esa hora (redondeada a la media hora). Al tocar un día de la
// cabecera, el costado muestra las reservas de ese día. previa: el horario que se está por publicar (la casilla elegida
// o lo escrito en «Publicar horarios»), marcado en el calendario para saber cuál es.
function VistaSemana({ datos, rango, ahora, dia, onDia, seleccionId, onElegirHorario, onElegirHueco, previa }) {
  const desplazable = useRef(null);
  const dias = diasDeSemana(datos.desde);
  const totalHoras = (rango.fin - rango.inicio) / 60;
  const { alto: altoHora, maximo } = useAltoHora(desplazable, totalHoras);
  const horas = [];
  for (let m = rango.inicio; m <= rango.fin; m += 60) horas.push(m);
  const posicion = (minutos) => `calc(var(--margen-rejilla) + var(--alto-hora) * ${(minutos - rango.inicio) / 60})`;
  const bloqueoDe = (fecha) => datos.bloqueos.find((b) => b.fechaInicio <= fecha && b.fechaFin >= fecha);
  const [hoy, horaAhora] = ahora.split('T');

  // Si el día no cabe entero (pantallas bajas), al abrir la semana se muestra la mañana, no la medianoche.
  useEffect(() => {
    const caja = desplazable.current;
    if (!caja || caja.scrollHeight <= caja.clientHeight) return;
    // Desde la hora entera del primer horario de la semana (o las 8:00 si no hay), con un cuarto de hora de aire.
    const primero = Math.min(...datos.horarios.map((h) => aMinutos(h.horaInicio)), 8 * 60);
    const objetivo = Math.max(Math.floor(primero / 60) * 60 - 15, rango.inicio);
    caja.scrollTop = ((objetivo - rango.inicio) / 60) * altoHora;
    // Solo al cambiar de semana o de pantalla: no se mueve el scroll cada minuto.
  }, [datos.desde, maximo]); // eslint-disable-line react-hooks/exhaustive-deps

  const elegirHueco = (evento, fecha) => {
    if (evento.target !== evento.currentTarget || !onElegirHueco) return;
    const caja = evento.currentTarget.getBoundingClientRect();
    const raiz = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    const margen = (parseFloat(getComputedStyle(evento.currentTarget).getPropertyValue('--margen-rejilla')) || 0.75) * raiz;
    const minutos = rango.inicio + Math.floor(((evento.clientY - caja.top - margen) / altoHora) * 2) * 30;
    if (minutos < rango.inicio || minutos >= rango.fin) return;
    const hora = aHora(minutos);
    if (`${fecha}T${hora}` <= ahora || bloqueoDe(fecha)) return;
    onElegirHueco({ fecha, hora });
  };

  return (
    <div className="semana" ref={desplazable} style={{ '--horas': totalHoras, '--alto-hora': `${altoHora}px`, ...(maximo && { maxHeight: maximo }) }}>
      <div className="semana__cabecera">
        <span className="semana__esquina" aria-hidden="true" />
        {dias.map((d) => {
          const cantidad = datos.horarios.filter((h) => h.fecha === d.fecha && h.reserva).length;
          const bloqueo = bloqueoDe(d.fecha);
          return (
            <button key={d.fecha} type="button" aria-pressed={d.fecha === dia} onClick={() => onDia?.(d.fecha)}
              aria-label={`Ver las reservas del ${diaLargo(d.fecha)}: ${cantidad ? `${cantidad} ${cantidad === 1 ? 'reserva' : 'reservas'}` : 'sin reservas'}${bloqueo ? ', día bloqueado' : ''}`}
              className={`semana__dia${d.fecha === hoy ? ' semana__dia--hoy' : ''}`}>
              <span className="semana__dia-nombre">{d.corto}</span>
              <span className="semana__dia-numero">{d.numero}</span>
              {/* El bloqueo se anuncia en la cabecera, que siempre está a la vista. */}
              {bloqueo ? (
                <span className="semana__dia-cuenta semana__dia-bloqueo" title={bloqueo.motivo || 'Día bloqueado'}>
                  <Icono nombre="candadoCerrado" tamano={12} /> Bloqueado
                </span>
              ) : <span className="semana__dia-cuenta">{cantidad ? `${cantidad} ${cantidad === 1 ? 'reserva' : 'reservas'}` : ' '}</span>}
            </button>
          );
        })}
      </div>
      <div className="semana__rejilla">
        <div className="semana__horas" aria-hidden="true">
          {horas.map((m) => <span key={m} style={{ top: posicion(m) }}>{aHora(m)}</span>)}
        </div>
        {dias.map((d) => {
          const bloqueo = bloqueoDe(d.fecha);
          const clases = ['semana__columna', d.fecha === hoy && 'semana__columna--hoy', d.fecha === dia && 'semana__columna--elegida',
            bloqueo && 'semana__columna--bloqueada', d.fecha < hoy && 'semana__columna--pasada'].filter(Boolean).join(' ');
          return (
            // El clic en un espacio vacío es un atajo del mouse; con teclado se usa «Publicar horarios».
            <div key={d.fecha} className={clases} onClick={(evento) => elegirHueco(evento, d.fecha)}>
              {datos.horarios.filter((h) => h.fecha === d.fecha).map((h) => {
                const duracion = aMinutos(h.horaFin) - aMinutos(h.horaInicio);
                const alto = (altoHora * duracion) / 60;
                const visible = estadoVisible(h);
                const clasesHorario = ['horario', `horario--${visible}`, alto < BLOQUE_MINI ? 'horario--mini' : alto < BLOQUE_CORTO && 'horario--corto',
                  h.id === seleccionId && 'horario--elegido'].filter(Boolean).join(' ');
                return (
                  <button key={h.id} type="button" className={clasesHorario} aria-pressed={h.id === seleccionId} aria-label={describirHorario(h)}
                    title={`${h.horaInicio}–${h.horaFin} · ${h.reserva ? `${h.reserva.usuario.nombre} · ` : ''}${ESTADOS[visible]}`}
                    style={{ top: posicion(aMinutos(h.horaInicio)), height: `calc(var(--alto-hora) * ${duracion / 60} - 2px)` }}
                    onClick={() => onElegirHorario(h)}>
                    <span className="horario__hora">{h.horaInicio}</span>
                    <span className="horario__quien">{h.reserva ? h.reserva.usuario.nombre : ESTADOS[visible]}</span>
                    <Detalles h={h} />
                  </button>
                );
              })}
              {previa?.fecha === d.fecha && previa.bloques.map((bloque) => {
                const duracion = aMinutos(bloque.horaFin) - aMinutos(bloque.horaInicio);
                const alto = (altoHora * duracion) / 60;
                return (
                  <span key={bloque.horaInicio} className={['horario', 'horario--nuevo', alto < BLOQUE_MINI ? 'horario--mini' : alto < BLOQUE_CORTO && 'horario--corto'].filter(Boolean).join(' ')}
                    aria-hidden="true" style={{ top: posicion(aMinutos(bloque.horaInicio)), height: `calc(var(--alto-hora) * ${duracion / 60} - 2px)` }}>
                    <span className="horario__hora">{bloque.horaInicio}</span>
                    <span className="horario__quien">Nuevo horario</span>
                  </span>
                );
              })}
              {d.fecha === hoy && aMinutos(horaAhora) >= rango.inicio && aMinutos(horaAhora) <= rango.fin && (
                <span className="semana__ahora" style={{ top: posicion(aMinutos(horaAhora)) }} aria-hidden="true" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// En pantallas angostas: los siete días como pestañas y la lista de horarios del día elegido.
function VistaDia({ datos, ahora, dia, onDia, seleccionId, onElegirHorario }) {
  const dias = diasDeSemana(datos.desde);
  const hoy = ahora.slice(0, 10);
  const delDia = datos.horarios.filter((h) => h.fecha === dia);
  const bloqueo = datos.bloqueos.find((b) => b.fechaInicio <= dia && b.fechaFin >= dia);
  return (
    <div className="semana-dia">
      <div className="semana-dia__selector" role="group" aria-label="Día de la semana">
        {dias.map((d) => {
          const total = datos.horarios.filter((h) => h.fecha === d.fecha).length;
          const citas = datos.horarios.filter((h) => h.fecha === d.fecha && h.reserva).length;
          return (
            <button key={d.fecha} type="button" aria-pressed={d.fecha === dia} onClick={() => onDia(d.fecha)}
              className={`semana-dia__opcion${d.fecha === hoy ? ' semana-dia__opcion--hoy' : ''}`}
              aria-label={`${diaLargo(d.fecha)}: ${total ? `${total} ${total === 1 ? 'horario' : 'horarios'}, ${citas} ${citas === 1 ? 'reserva' : 'reservas'}` : 'sin horarios'}`}>
              <span>{d.corto}</span>
              <strong>{d.numero}</strong>
              <i className={`semana-dia__punto${citas ? ' semana-dia__punto--citas' : total ? '' : ' semana-dia__punto--vacio'}`} aria-hidden="true" />
            </button>
          );
        })}
      </div>
      <h3 className="semana-dia__titulo">{diaLargo(dia)}</h3>
      {bloqueo && (
        <p className="semana-dia__bloqueo"><Icono nombre="candadoCerrado" tamano={16} /> Día bloqueado{bloqueo.motivo ? `: ${bloqueo.motivo}` : ''}. Sus horarios no se muestran a los usuarios.</p>
      )}
      {delDia.length ? (
        <ol className="semana-dia__lista">
          {delDia.map((h) => {
            const visible = estadoVisible(h);
            return (
              <li key={h.id}>
                <button type="button" aria-pressed={h.id === seleccionId} aria-label={describirHorario(h)} onClick={() => onElegirHorario(h)}
                  className={['semana-dia__horario', `horario--${visible}`, h.id === seleccionId && 'horario--elegido'].filter(Boolean).join(' ')}>
                  <time className="semana-dia__hora">{h.horaInicio}<small>{h.horaFin}</small></time>
                  <span className="semana-dia__quien">
                    <strong>{h.reserva ? h.reserva.usuario.nombre : 'Horario libre'}</strong>
                    <span>{ESTADOS[visible]}{h.reserva?.modalidad === 'online' ? ' · Online' : ''}{h.reserva?.primeraVisita ? ' · Primera visita' : ''}</span>
                  </span>
                  <Icono nombre="chevron" tamano={18} className="semana-dia__flecha" />
                </button>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="semana-dia__vacio">No tienes horarios publicados este día.</p>
      )}
    </div>
  );
}

export default function CalendarioSemana({ modo, ...props }) {
  return modo === 'dia' ? <VistaDia {...props} /> : <VistaSemana {...props} />;
}

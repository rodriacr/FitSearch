import { useEffect, useRef } from 'react';
import Icono from '../Icono.jsx';
import { aHora, aMinutos, describirHorario, diaLargo, diasDeSemana, ESTADOS } from './semana.js';
import './CalendarioSemana.css';

function Detalles({ h }) {
  if (!h.reserva) return null;
  return (
    <span className="horario__marcas" aria-hidden="true">
      {h.reserva.modalidad === 'online' && <Icono nombre="video" tamano={14} />}
      {h.reserva.primeraVisita && <span className="horario__primera">1.ª</span>}
    </span>
  );
}

// Semana con columnas por día y una fila por hora. Cada horario es un botón ubicado según
// su hora; un clic en un espacio vacío (futuro) propone publicar un horario a esa hora (redondeada a la media hora).
function VistaSemana({ datos, rango, ahora, seleccionId, onElegirHorario, onElegirHueco }) {
  const desplazable = useRef(null);
  const dias = diasDeSemana(datos.desde);
  const horas = [];
  for (let m = rango.inicio; m <= rango.fin; m += 60) horas.push(m);
  const posicion = (minutos) => `calc(var(--margen-rejilla) + var(--alto-hora) * ${(minutos - rango.inicio) / 60})`;
  const bloqueoDe = (fecha) => datos.bloqueos.find((b) => b.fechaInicio <= fecha && b.fechaFin >= fecha);
  const [hoy, horaAhora] = ahora.split('T');

  // Al abrir la semana se muestra la mañana (o la hora actual si es hoy), no la medianoche.
  useEffect(() => {
    const caja = desplazable.current;
    if (!caja) return;
    const alto = parseFloat(getComputedStyle(caja).getPropertyValue('--alto-hora')) || 64;
    const pxHora = alto * (alto < 10 ? parseFloat(getComputedStyle(document.documentElement).fontSize) : 1);
    // Desde la hora entera del primer horario de la semana (o las 8:00 si no hay), con un cuarto de hora de aire.
    const primero = Math.min(...datos.horarios.map((h) => aMinutos(h.horaInicio)), 8 * 60);
    const objetivo = Math.max(Math.floor(primero / 60) * 60 - 15, rango.inicio);
    caja.scrollTop = ((objetivo - rango.inicio) / 60) * pxHora;
    // Solo al cambiar de semana: no se mueve el scroll cada minuto.
  }, [datos.desde]); // eslint-disable-line react-hooks/exhaustive-deps

  const elegirHueco = (evento, fecha) => {
    if (evento.target !== evento.currentTarget || !onElegirHueco) return;
    const caja = evento.currentTarget.getBoundingClientRect();
    const estilo = getComputedStyle(evento.currentTarget);
    const raiz = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    const pxHora = parseFloat(estilo.getPropertyValue('--alto-hora')) * raiz;
    const margen = parseFloat(estilo.getPropertyValue('--margen-rejilla')) * raiz;
    const minutos = rango.inicio + Math.floor(((evento.clientY - caja.top - margen) / pxHora) * 2) * 30;
    if (minutos < rango.inicio || minutos >= rango.fin) return;
    const hora = aHora(minutos);
    if (`${fecha}T${hora}` <= ahora || bloqueoDe(fecha)) return;
    onElegirHueco({ fecha, hora });
  };

  return (
    <div className="semana" ref={desplazable} style={{ '--horas': (rango.fin - rango.inicio) / 60 }}>
      <div className="semana__cabecera">
        <span className="semana__esquina" aria-hidden="true" />
        {dias.map((d) => {
          const cantidad = datos.horarios.filter((h) => h.fecha === d.fecha && h.estado !== 'libre').length;
          const bloqueo = bloqueoDe(d.fecha);
          return (
            <div key={d.fecha} className={`semana__dia${d.fecha === hoy ? ' semana__dia--hoy' : ''}`}>
              <span className="semana__dia-nombre">{d.corto}</span>
              <span className="semana__dia-numero">{d.numero}</span>
              {/* El bloqueo se anuncia en la cabecera, que siempre está a la vista (la columna se desplaza). */}
              {bloqueo ? (
                <span className="semana__dia-cuenta semana__dia-bloqueo" title={bloqueo.motivo || 'Día bloqueado'}>
                  <Icono nombre="candadoCerrado" tamano={12} /> Bloqueado
                </span>
              ) : <span className="semana__dia-cuenta">{cantidad ? `${cantidad} ${cantidad === 1 ? 'cita' : 'citas'}` : ' '}</span>}
            </div>
          );
        })}
      </div>
      <div className="semana__rejilla">
        <div className="semana__horas" aria-hidden="true">
          {horas.map((m) => <span key={m} style={{ top: posicion(m) }}>{aHora(m)}</span>)}
        </div>
        {dias.map((d) => {
          const bloqueo = bloqueoDe(d.fecha);
          const clases = ['semana__columna', d.fecha === hoy && 'semana__columna--hoy', bloqueo && 'semana__columna--bloqueada',
            d.fecha < hoy && 'semana__columna--pasada'].filter(Boolean).join(' ');
          return (
            // El clic en un espacio vacío es un atajo del mouse; con teclado se usa «Publicar horarios».
            <div key={d.fecha} className={clases} onClick={(evento) => elegirHueco(evento, d.fecha)}>
              {datos.horarios.filter((h) => h.fecha === d.fecha).map((h) => {
                const duracion = aMinutos(h.horaFin) - aMinutos(h.horaInicio);
                const clasesHorario = ['horario', `horario--${h.estado}`, h.pasado && 'horario--pasado', duracion <= 30 && 'horario--corto',
                  h.id === seleccionId && 'horario--elegido'].filter(Boolean).join(' ');
                return (
                  <button key={h.id} type="button" className={clasesHorario} aria-pressed={h.id === seleccionId} aria-label={describirHorario(h)}
                    style={{ top: posicion(aMinutos(h.horaInicio)), height: `calc(var(--alto-hora) * ${duracion / 60} - 2px)` }}
                    onClick={() => onElegirHorario(h)}>
                    <span className="horario__hora">{h.horaInicio}</span>
                    <span className="horario__quien">{h.reserva ? h.reserva.usuario.nombre : ESTADOS.libre}</span>
                    <Detalles h={h} />
                  </button>
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
          const citas = datos.horarios.filter((h) => h.fecha === d.fecha && h.estado !== 'libre').length;
          return (
            <button key={d.fecha} type="button" aria-pressed={d.fecha === dia} onClick={() => onDia(d.fecha)}
              className={`semana-dia__opcion${d.fecha === hoy ? ' semana-dia__opcion--hoy' : ''}`}
              aria-label={`${diaLargo(d.fecha)}: ${total ? `${total} ${total === 1 ? 'horario' : 'horarios'}, ${citas} ${citas === 1 ? 'cita' : 'citas'}` : 'sin horarios'}`}>
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
          {delDia.map((h) => (
            <li key={h.id}>
              <button type="button" aria-pressed={h.id === seleccionId} aria-label={describirHorario(h)} onClick={() => onElegirHorario(h)}
                className={['semana-dia__horario', `horario--${h.estado}`, h.pasado && 'horario--pasado', h.id === seleccionId && 'horario--elegido'].filter(Boolean).join(' ')}>
                <time className="semana-dia__hora">{h.horaInicio}<small>{h.horaFin}</small></time>
                <span className="semana-dia__quien">
                  <strong>{h.reserva ? h.reserva.usuario.nombre : 'Horario libre'}</strong>
                  <span>{ESTADOS[h.estado]}{h.reserva?.modalidad === 'online' ? ' · Online' : ''}{h.reserva?.primeraVisita ? ' · Primera visita' : ''}{h.pasado ? ' · Ya pasó' : ''}</span>
                </span>
                <Icono nombre="chevron" tamano={18} className="semana-dia__flecha" />
              </button>
            </li>
          ))}
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

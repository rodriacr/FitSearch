import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Alerta from '../../components/Alerta.jsx';
import Icono from '../../components/Icono.jsx';
import { SECCIONES_PROFESIONAL as SECCIONES } from '../../components/diseno/secciones.js';
import { useSesion } from '../../context/SesionContext.jsx';
import ClimaActual from '../../components/profesional/ClimaActual.jsx';
import { ahoraChile } from '../../services/agenda.js';
import { diaLargo, lunesDe } from '../../components/agenda/semana.js';
import { estadoCita } from '../../services/actividadProfesional.service.js';
import { primerNombre } from '../../services/formato.js';
import { obtenerMiFicha } from '../../services/profesional.service.js';
import { diaYMes, obtenerReportes } from '../../services/actividadProfesional.service.js';
import { solicitar } from '../../services/api.js';
import './InicioProfesional.css';

const Proximamente = () => <span className="etiqueta-proximamente">Próximamente</span>;

// Tareas que el profesional puede resolver desde su espacio. Las citas por confirmar vienen del resumen semanal (FS-HU-28).
// Desde el 16-11-2026 se sugiere la presentación (la descripción de la ficha ya no se edita).
function tareasDe(ficha, tieneHorarios, porConfirmar, sinPresentacion) {
  const tareas = [];
  if (porConfirmar > 0) {
    tareas.push({ icono: 'calendario', titulo: `Tienes ${porConfirmar} ${porConfirmar === 1 ? 'cita' : 'citas'} por confirmar`, detalle: 'Confírmalas o cancélalas en tu agenda.', a: SECCIONES.agenda.ruta, accion: 'Revisar' });
  }
  if (!ficha) {
    tareas.push({ icono: 'medico', titulo: 'Completa tu ficha profesional', detalle: 'Sin ficha no apareces en el buscador de FitSearch.', a: SECCIONES.perfil.ruta, accion: 'Completar' });
  } else if (sinPresentacion) {
    tareas.push({ icono: 'lapiz', titulo: 'Agrega tu presentación', detalle: 'Cuéntales a las personas quién eres y cómo es tu atención.', a: SECCIONES.perfil.ruta, accion: 'Agregar' });
  }
  if (tieneHorarios === false) tareas.push({ icono: 'calendario', titulo: 'Define tu disponibilidad', detalle: 'Publica tus horarios para que puedan reservar contigo.', a: SECCIONES.agenda.ruta, accion: 'Publicar horario' });
  return tareas;
}

const ACCESOS = [
  { seccion: 'agenda', nombre: 'Publicar horario', icono: 'calendario' },
  { seccion: 'perfil', nombre: 'Mi perfil profesional', icono: 'medico' },
  { seccion: 'clientes', nombre: 'Clientes', icono: 'grupo' },
  { seccion: 'mensajes', nombre: 'Mensajes', icono: 'chat' },
];

// Resumen de la semana en curso (FS-HU-28), calculado por la API de reportes.
const RESUMEN = [
  { clave: 'totalClientes', nombre: 'Total de clientes' },
  { clave: 'citasRealizadas', nombre: 'Citas realizadas' },
  { clave: 'citasPendientes', nombre: 'Citas por confirmar' },
  { clave: 'clientesNuevos', nombre: 'Clientes nuevos' },
];

// Paisaje del saludo (SVG propio, sin fotografías): cerros y sol de la tarde.
function Paisaje() {
  return (
    <svg className="inicio-prof__paisaje" viewBox="0 0 800 220" preserveAspectRatio="xMaxYMax slice" aria-hidden="true">
      <circle cx="640" cy="150" r="70" className="paisaje__sol" />
      <path d="M0 175 L120 120 L210 150 L330 80 L440 140 L520 105 L640 150 L720 110 L800 135 L800 220 L0 220 Z" className="paisaje__cerro paisaje__cerro--lejos" />
      <path d="M0 200 L90 160 L190 185 L300 140 L420 190 L540 150 L660 190 L760 165 L800 175 L800 220 L0 220 Z" className="paisaje__cerro paisaje__cerro--cerca" />
    </svg>
  );
}

// Inicio del profesional (mockup del PO del 04-10-2026; DAS, D25 y D26).
export default function InicioProfesional() {
  const { sesion } = useSesion();
  const [intento, setIntento] = useState(0);
  const [estado, setEstado] = useState({ intento: -1 });
  const [ahora, setAhora] = useState(ahoraChile);
  const hoy = ahora.slice(0, 10);
  const semana = lunesDe(hoy);
  useEffect(() => {
    const reloj = setInterval(() => setAhora(ahoraChile()), 60000);
    return () => clearInterval(reloj);
  }, []);
  useEffect(() => {
    let activo = true;
    const fuentes = [obtenerMiFicha(), obtenerReportes(4), solicitar('/perfil/cuenta'), solicitar('/disponibilidades'), solicitar('/reservas')];
    Promise.allSettled(fuentes).then(([ficha, reporte, cuenta, horarios, reservas]) => {
      if (!activo) return;
      const errores = [];
      const leer = (resultado, etiqueta) => {
        if (resultado.status === 'fulfilled') return resultado.value;
        errores.push(etiqueta);
        return null;
      };
      const propia = leer(ficha, 'tu ficha');
      const citas = leer(reservas, 'tus reservas');
      const personal = leer(cuenta, 'tu presentación');
      const disponibilidad = propia?.ficha ? leer(horarios, 'tus horarios') : null;
      const estadisticas = propia?.ficha ? leer(reporte, 'el resumen semanal') : null;
      setEstado({ intento, semana, ficha: propia?.ficha, fichaComprobada: Boolean(propia),
        reservas: citas?.reservas ?? null, cuenta: personal?.cuenta,
        tieneHorarios: propia && !propia.ficha ? false : disponibilidad ? disponibilidad.horarios.length > 0 : null,
        resumen: estadisticas?.resumenSemanal ?? null, errores });
    });
    return () => { activo = false; };
  }, [intento, semana]);
  const cargando = estado.intento !== intento || estado.semana !== semana;
  const reintentar = () => setIntento((n) => n + 1);
  const futuras = estado.reservas?.filter((r) => r.estado !== 'cancelada' && `${r.horario.fecha}T${r.horario.horaInicio}` > ahora)
    .sort((a, b) => `${a.horario.fecha}T${a.horario.horaInicio}`.localeCompare(`${b.horario.fecha}T${b.horario.horaInicio}`));
  const delDia = estado.reservas?.filter((r) => r.estado !== 'cancelada' && r.horario.fecha === hoy)
    .sort((a, b) => a.horario.horaInicio.localeCompare(b.horario.horaInicio));
  const siguientes = futuras?.filter((r) => r.horario.fecha !== hoy).slice(0, 3) ?? [];
  const tareas = estado.fichaComprobada ? tareasDe(estado.ficha, estado.tieneHorarios,
    Math.max(futuras?.filter((r) => r.estado === 'pendiente').length ?? 0, estado.resumen?.citasPendientes ?? 0),
    Boolean(estado.cuenta) && !estado.cuenta.biografia?.trim()) : [];
  const resumen = estado.resumen;
  const cita = (r) => {
    const pasada = `${r.horario.fecha}T${r.horario.horaInicio}` <= ahora;
    const visible = estadoCita({ estado: r.estado, pasada });
    return <li key={r.id} className={`dia-prof__cita${pasada ? ' dia-prof__cita--pasada' : ''}`}>
      <time className="dia-prof__hora">{r.horario.horaInicio}<small>{r.horario.horaFin}</small></time>
      <div className="dia-prof__persona"><strong>{r.usuario.nombre}</strong><span>{r.horario.fecha !== hoy && `${diaYMes(r.horario.fecha)} · `}{r.modalidad === 'online' ? 'Atención online' : 'Atención presencial'}</span></div>
      <span className={`dia-prof__estado dia-prof__estado--${visible.clave}`}>{visible.nombre}</span>
      <Link className="boton-icono" to={`/profesional/agenda?semana=${lunesDe(r.horario.fecha)}&dia=${r.horario.fecha}&horario=${r.horario.id}`} aria-label={`Ver reserva de ${r.usuario.nombre}`}><Icono nombre="chevronDerecha" tamano={18} /></Link>
    </li>;
  };
  return <div className="inicio-prof">
    <section className="inicio-prof__hero" aria-labelledby="titulo-inicio-prof">
      <Paisaje />
      <div className="inicio-prof__saludo">
        <p className="inicio-prof__fecha">{diaLargo(hoy)}</p>
        <h1 id="titulo-inicio-prof">¡Hola, {primerNombre(sesion.usuario.nombre)}!</h1>
        <p>Tu agenda, tus clientes y lo que necesita tu atención hoy.</p>
      </div>
      <ClimaActual />
    </section>

    <section className="panel-tarjeta inicio-prof__resumen" aria-labelledby="titulo-resumen-semanal">
      <div className="dia-prof__cabecera"><h2 id="titulo-resumen-semanal" className="panel-tarjeta__titulo"><Icono nombre="grafico" tamano={20} /> Resumen semanal</h2><Link className="enlace-panel" to={SECCIONES.reportes.ruta}>Ver reportes <Icono nombre="flecha" tamano={16} /></Link></div>
      <ul className="resumen-semanal">{RESUMEN.map(({ clave, nombre }) => <li key={clave}><span>{nombre}</span>{resumen ? <strong>{resumen[clave]}</strong> : <strong aria-label={cargando ? 'Cargando' : 'Sin datos todavía'}>—</strong>}</li>)}</ul>
      <p className="texto-secundario resumen-semanal__nota">{resumen && `Semana del ${diaYMes(resumen.inicio)} al ${diaYMes(resumen.fin)}. `}Los clientes se cuentan desde tu primera reserva.</p>
    </section>

    <div className="inicio-prof__actividad">
      <section className="panel-tarjeta dia-prof" aria-labelledby="titulo-dia-prof">
        <div className="dia-prof__cabecera"><div><h2 id="titulo-dia-prof" className="panel-tarjeta__titulo"><span className="panel-tarjeta__icono"><Icono nombre="calendario" tamano={20} /></span> Atenciones de hoy</h2></div><Link to={SECCIONES.agenda.ruta} className="enlace-panel">Ver agenda <Icono nombre="flecha" tamano={16} /></Link></div>
        <p className="texto-secundario dia-prof__zona">Horarios en hora de Chile (Santiago).</p>
        {cargando && <p role="status">Cargando tus reservas…</p>}
        {!cargando && !delDia && (
          <div><Alerta>No pudimos cargar tus reservas.</Alerta><button type="button" className="boton-texto" onClick={reintentar}>Reintentar reservas</button></div>
        )}
        {!cargando && delDia?.length > 0 && (
          <ul className="dia-prof__lista">{delDia.map(cita)}</ul>
        )}
        {!cargando && delDia?.length === 0 && (
          <div className="dia-prof__vacio">
            <span className="dia-prof__vacio-icono"><Icono nombre="calendario" tamano={26} /></span>
            <h3>No tienes atenciones hoy</h3>
            <Link className="boton boton--secundario boton--compacto" to={SECCIONES.agenda.ruta}>Revisar mi disponibilidad</Link>
          </div>
        )}
        {!cargando && siguientes.length > 0 && <div className="dia-prof__proximas"><h3>Próximas atenciones</h3><ul className="dia-prof__lista">{siguientes.map(cita)}</ul></div>}
      </section>
      <div className="inicio-prof__costado">
        <section className="panel-tarjeta inicio-prof__tareas" aria-labelledby="titulo-tareas">
          <h2 id="titulo-tareas" className="panel-tarjeta__titulo"><span className="panel-tarjeta__icono"><Icono nombre="check" tamano={20} /></span> Tareas pendientes</h2>
          {cargando ? <p className="texto-secundario" role="status">Cargando tus tareas…</p> : <>
            {estado.errores.length > 0 && <div className="inicio-prof__error"><p role="alert">No pudimos comprobar {estado.errores.join(', ')}. Las tareas pueden estar incompletas.</p><button type="button" className="boton-texto" onClick={reintentar}>Reintentar tareas</button></div>}
            {tareas.length > 0 ? <ul className="tareas">{tareas.map(({ icono, titulo, detalle, a, accion }) => (
              <li key={titulo} className="tarea">
                <span className="tarea__icono"><Icono nombre={icono} tamano={20} /></span>
                <div className="tarea__texto">
                  <strong>{titulo}</strong>
                  <span>{detalle}</span>
                  <Link to={a} className="tarea__accion">{accion} <Icono nombre="flecha" tamano={16} /></Link>
                </div>
              </li>
            ))}</ul> : estado.errores.length === 0 && <p className="inicio-prof__al-dia"><Icono nombre="check" tamano={18} /> Estás al día: no tienes tareas pendientes.</p>}
          </>}
        </section>
        <section className="panel-tarjeta" aria-labelledby="titulo-accesos-prof"><h2 id="titulo-accesos-prof" className="panel-tarjeta__titulo"><span className="panel-tarjeta__icono"><Icono nombre="rayo" tamano={20} /></span> Accesos rápidos</h2><ul className="accesos-prof">{ACCESOS.map(({ seccion, nombre, icono }) => <li key={seccion}><Link to={SECCIONES[seccion].ruta} className="acceso-prof"><Icono nombre={icono} tamano={18} /><span>{nombre}</span>{SECCIONES[seccion].proximamente && <Proximamente />}</Link></li>)}</ul></section>
      </div>
    </div>
  </div>;
}

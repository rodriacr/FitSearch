import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Icono from '../../components/Icono.jsx';
import { SECCIONES_PROFESIONAL as SECCIONES } from '../../components/diseno/secciones.js';
import { useSesion } from '../../context/SesionContext.jsx';
import { obtenerClima } from '../../services/clima.service.js';
import { primerNombre } from '../../services/formato.js';
import { obtenerMiFicha } from '../../services/profesional.service.js';
import './InicioProfesional.css';

const Proximamente = () => <span className="etiqueta-proximamente">Próximamente</span>;

// Ícono según el estado del clima que entrega la API (DAS, D26).
const ICONO_CLIMA = { despejado: 'sol', parcial: 'nubeSol', nublado: 'nube', niebla: 'niebla', llovizna: 'lluvia', lluvia: 'lluvia', nieve: 'nieve', tormenta: 'tormenta' };
const iconoClima = ({ estado, esDeDia }) => {
  if (!esDeDia && estado === 'despejado') return 'luna';
  if (!esDeDia && estado === 'parcial') return 'nube';
  return ICONO_CLIMA[estado] ?? 'nube';
};

// Si el clima no está disponible, la tarjeta simplemente no aparece: el Inicio no depende de Open-Meteo.
function TarjetaClima({ clima }) {
  if (!clima) return null;
  return (
    <div className={`clima clima--${clima.esDeDia ? 'dia' : 'noche'}`} aria-label={`Clima en ${clima.lugar}: ${clima.temperatura} grados, ${clima.descripcion}`} role="group">
      <Icono nombre={iconoClima(clima)} tamano={34} className="clima__icono" />
      <div>
        <p className="clima__lugar">{clima.lugar}</p>
        <p className="clima__temperatura">{clima.temperatura}°C</p>
        <p className="clima__descripcion">{clima.descripcion}</p>
      </div>
      <a className="clima__fuente" href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">Datos: Open-Meteo</a>
    </div>
  );
}

// Tareas reales que hoy puede resolver el profesional; las que dependen de reservas llegan con la agenda.
function tareasDe(ficha) {
  const tareas = [];
  if (!ficha) {
    tareas.push({ icono: 'medico', titulo: 'Completa tu ficha profesional', detalle: 'Sin ficha no apareces en el buscador de FitSearch.', a: SECCIONES.perfil.ruta, accion: 'Completar' });
  } else if (!ficha.descripcion) {
    tareas.push({ icono: 'lapiz', titulo: 'Agrega una descripción a tu ficha', detalle: 'Cuéntales a las personas cómo es tu atención.', a: SECCIONES.perfil.ruta, accion: 'Agregar' });
  }
  tareas.push({ icono: 'calendario', titulo: 'Define tu disponibilidad', detalle: 'Publica tus horarios para que puedan reservar contigo.', a: SECCIONES.agenda.ruta, proximamente: true });
  return tareas;
}

const ACCESOS = [
  { seccion: 'agenda', nombre: 'Publicar horario', icono: 'calendario' },
  { seccion: 'perfil', nombre: 'Mi perfil profesional', icono: 'medico' },
  { seccion: 'clientes', nombre: 'Clientes', icono: 'grupo' },
  { seccion: 'mensajes', nombre: 'Mensajes', icono: 'chat' },
];

const RESUMEN = ['Total de clientes', 'Citas realizadas', 'Citas pendientes', 'Clientes nuevos'];

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
  const [ficha, setFicha] = useState({ cargando: true });
  const [clima, setClima] = useState(null);

  useEffect(() => {
    let activo = true;
    obtenerMiFicha()
      .then(({ ficha: datos }) => activo && setFicha({ datos }))
      .catch(() => activo && setFicha({ error: true }));
    obtenerClima()
      .then((datos) => activo && setClima(datos))
      .catch(() => activo && setClima(null));
    return () => { activo = false; };
  }, []);

  const tareas = ficha.cargando || ficha.error ? [] : tareasDe(ficha.datos);

  return (
    <div className="inicio-prof">
      <section className="inicio-prof__hero" aria-labelledby="titulo-inicio-prof">
        <Paisaje />
        <div className="inicio-prof__saludo">
          <h1 id="titulo-inicio-prof">¡Hola, {primerNombre(sesion.usuario.nombre)}!</h1>
          <p>Aquí tienes un resumen de tu día y lo más importante de tu actividad profesional.</p>
          <p className="inicio-prof__frase"><Icono nombre="chispa" tamano={16} /> La constancia de hoy es el resultado de mañana.</p>
        </div>
        <TarjetaClima clima={clima} />
      </section>

      <div className="inicio-prof__grilla">
        <section className="panel-tarjeta" aria-labelledby="titulo-tareas">
          <h2 id="titulo-tareas" className="panel-tarjeta__titulo"><span className="panel-tarjeta__icono"><Icono nombre="check" tamano={20} /></span> Tareas pendientes</h2>
          {ficha.cargando ? <p className="texto-secundario" role="status">Cargando tus tareas…</p> : (
            <ul className="tareas">
              {ficha.error && <li className="texto-secundario">No pudimos revisar tu ficha. Intenta nuevamente más tarde.</li>}
              {tareas.map(({ icono, titulo, detalle, a, accion, proximamente }) => (
                <li key={titulo} className="tarea">
                  <span className="tarea__icono"><Icono nombre={icono} tamano={20} /></span>
                  <div className="tarea__texto"><strong>{titulo}</strong><span>{detalle}</span></div>
                  {proximamente ? <Proximamente /> : <Link to={a} className="tarea__accion">{accion} <Icono nombre="flecha" tamano={16} /></Link>}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="panel-tarjeta" aria-labelledby="titulo-accesos-prof">
          <h2 id="titulo-accesos-prof" className="panel-tarjeta__titulo"><span className="panel-tarjeta__icono"><Icono nombre="rayo" tamano={20} /></span> Accesos rápidos</h2>
          <ul className="accesos-prof">
            {ACCESOS.map(({ seccion, nombre, icono }) => (
              <li key={seccion}>
                <Link to={SECCIONES[seccion].ruta} className="acceso-prof">
                  <Icono nombre={icono} tamano={24} />
                  <span>{nombre}</span>
                  {SECCIONES[seccion].proximamente && <Proximamente />}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="panel-tarjeta" aria-labelledby="titulo-resumen-semanal">
        <h2 id="titulo-resumen-semanal" className="panel-tarjeta__titulo">
          <span className="panel-tarjeta__icono"><Icono nombre="grafico" tamano={20} /></span> Resumen semanal <Proximamente />
        </h2>
        <ul className="resumen-semanal">
          {RESUMEN.map((nombre) => <li key={nombre}><span>{nombre}</span><strong aria-label="Sin datos todavía">—</strong></li>)}
        </ul>
        <p className="texto-secundario resumen-semanal__nota">Estas cifras se activarán cuando las personas puedan reservar horas contigo.</p>
      </section>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Alerta from '../components/Alerta.jsx';
import Icono from '../components/Icono.jsx';
import { Logo } from '../components/PantallaAcceso.jsx';
import { useSesion } from '../context/SesionContext.jsx';
import './Inicio.css';

const AREAS = [
  { icono: 'corazon', nombre: 'Salud y bienestar', texto: 'Dale espacio a tu bienestar físico y emocional.' },
  { icono: 'actividad', nombre: 'Deporte y movimiento', texto: 'Encuentra tu ritmo y avanza hacia tus objetivos.' },
  { icono: 'balanza', nombre: 'Alimentación', texto: 'Conoce tus necesidades y construye mejores hábitos.' },
];

const HERRAMIENTAS = [
  { icono: 'usuario', nombre: 'Un perfil que habla de ti', texto: 'Reúne tus datos personales, objetivos e información de salud en un mismo lugar.', disponible: true },
  { icono: 'medico', nombre: 'Profesionales cerca de ti', texto: 'Un directorio para descubrir profesionales y establecimientos según lo que necesitas.' },
  { icono: 'rayo', nombre: 'Orientación con IA', texto: 'Un asistente para ayudarte a identificar qué tipo de profesional buscar.' },
  { icono: 'calendario', nombre: 'Tu siguiente paso, agendado', texto: 'Consulta la disponibilidad de un profesional y reserva una hora de atención.' },
];

// Portada pública, solo para invitados: con sesión iniciada App redirige al perfil.
// Las funciones futuras se presentan sin simular servicios ni resultados.
export default function Inicio() {
  const { aviso: avisoSesion, limpiarAviso } = useSesion();
  // El aviso de cierre de sesión se muestra una sola vez: la portada lo conserva y lo descarta del contexto
  // para que no reaparezca en otra pantalla (seguro con StrictMode, que repite los efectos en desarrollo).
  const [aviso] = useState(avisoSesion);
  useEffect(() => { limpiarAviso(); }, [limpiarAviso]);

  return (
    <div className="inicio">
      <a className="inicio__saltar" href="#contenido">Saltar al contenido</a>
      <header className="inicio__encabezado">
        <div className="inicio__ancho inicio__barra">
          <Link to="/" className="inicio__marca" aria-label="FitSearch, inicio"><Logo /></Link>
          <nav className="inicio__navegacion" aria-label="Navegación principal">
            <a href="#conoce-fitsearch">Conoce FitSearch</a>
            <a href="#como-empezar">Cómo empezar</a>
          </nav>
          <div className="inicio__accesos">
            <Link to="/iniciar-sesion" className="inicio__enlace-acceso">Iniciar sesión</Link>
            <Link to="/registro" className="boton boton--compacto">Crear cuenta <Icono nombre="flecha" tamano={18} /></Link>
          </div>
        </div>
      </header>

      <main id="contenido" tabIndex={-1}>
        <section className="inicio__portada" aria-labelledby="titulo-inicio">
          <div className="inicio__ancho inicio__portada-grilla">
            <div className="inicio__presentacion">
              {aviso && <Alerta tipo={aviso.tipo}>{aviso.texto}</Alerta>}
              <p className="inicio__antetitulo"><span /> SALUD · DEPORTE · BIENESTAR</p>
              <h1 id="titulo-inicio">Tu bienestar,<br />un paso <span>más cerca.</span></h1>
              <p className="inicio__introduccion">Cada camino empieza contigo. Conoce tus objetivos y descubre una nueva forma de conectar con tu salud, tu alimentación y el movimiento.</p>
              <div className="inicio__acciones">
                <Link to="/registro" className="boton boton--principal boton--compacto">
                  Comenzar mi camino <Icono nombre="flecha" />
                </Link>
                <a href="#conoce-fitsearch" className="inicio__enlace">Descubrir FitSearch <Icono nombre="flecha" tamano={18} /></a>
              </div>
              <p className="inicio__nota"><Icono nombre="check" tamano={17} /> A tu ritmo. Con tus propios objetivos.</p>
            </div>

            <div className="inicio__universo" role="img" aria-label="Tu bienestar en el centro: salud, movimiento y alimentación conectados">
              <div className="inicio__orbita inicio__orbita--exterior" />
              <div className="inicio__orbita inicio__orbita--interior" />
              <span className="inicio__punto inicio__punto--uno" />
              <span className="inicio__punto inicio__punto--dos" />
              <div className="inicio__centro"><Icono nombre="corazon" tamano={46} /><strong>Todo empieza<br />contigo.</strong><span>Tu espacio de bienestar</span></div>
              <div className="inicio__flotante inicio__flotante--salud"><span><Icono nombre="medico" tamano={25} /></span><div><small>CUIDA DE TI</small><strong>Salud y bienestar</strong></div></div>
              <div className="inicio__flotante inicio__flotante--movimiento"><span><Icono nombre="mancuerna" tamano={25} /></span><div><small>ENCUENTRA TU RITMO</small><strong>Más movimiento</strong></div></div>
              <div className="inicio__flotante inicio__flotante--alimentacion"><span><Icono nombre="balanza" tamano={25} /></span><div><small>CONSTRUYE HÁBITOS</small><strong>Mejor alimentación</strong></div></div>
              <p className="inicio__universo-pie">Un mismo lugar. Tu propio camino.</p>
            </div>
          </div>
        </section>

        <section className="inicio__areas inicio__ancho" aria-label="Áreas de bienestar">
          {AREAS.map(({ icono, nombre, texto }) => (
            <div className="inicio__area" key={nombre}><span className="inicio__icono-area"><Icono nombre={icono} tamano={26} /></span><div><h2>{nombre}</h2><p>{texto}</p></div></div>
          ))}
        </section>

        <section id="conoce-fitsearch" className="inicio__seccion inicio__ancho" aria-labelledby="titulo-herramientas">
          <div className="inicio__titulo-seccion"><p className="inicio__antetitulo">PENSADO PARA TU DÍA A DÍA</p><h2 id="titulo-herramientas">Distintas necesidades.<br />Un lugar para empezar.</h2><p>Estamos construyendo un espacio que conecta las distintas partes de tu bienestar. Empieza hoy con tu perfil.</p></div>
          <div className="inicio__herramientas">
            {HERRAMIENTAS.map(({ icono, nombre, texto, disponible }) => (
              <article key={nombre} className={`inicio__herramienta${disponible ? ' inicio__herramienta--disponible' : ''}`}>
                <div className="inicio__herramienta-superior"><span className="inicio__icono-herramienta"><Icono nombre={icono} tamano={26} /></span><span className={`inicio__estado${disponible ? ' inicio__estado--disponible' : ''}`}>{disponible ? 'Disponible' : 'Próximamente'}</span></div>
                <h3>{nombre}</h3><p>{texto}</p>
                {disponible && <Link to="/registro" className="inicio__enlace">Crear mi perfil <Icono nombre="flecha" tamano={18} /></Link>}
              </article>
            ))}
          </div>
        </section>

        <section id="como-empezar" className="inicio__pasos-fondo" aria-labelledby="titulo-pasos">
          <div className="inicio__ancho inicio__seccion inicio__pasos-contenido">
            <div className="inicio__titulo-seccion"><p className="inicio__antetitulo">EL PRIMER PASO ES TUYO</p><h2 id="titulo-pasos">Conocerte mejor.<br />Empezar a cuidarte.</h2><p>No necesitas tener todo resuelto. Comienza por lo que importa: tú.</p><Link to="/registro" className="inicio__enlace">Quiero comenzar <Icono nombre="flecha" tamano={18} /></Link></div>
            <ol className="inicio__pasos">
              <li><span>01</span><div><h3>Crea tu cuenta</h3><p>Regístrate con tu correo y elige tu rol: usuario o profesional.</p></div></li>
              <li><span>02</span><div><h3>Cuéntanos sobre ti</h3><p>Completa tu perfil con tus datos, tus objetivos y tu información de salud.</p></div></li>
              <li><span>03</span><div><h3>Conoce tu punto de partida</h3><p>Consulta el resumen de tu perfil y tu requerimiento calórico estimado. Puedes actualizar tus datos cuando lo necesites.</p></div></li>
            </ol>
          </div>
        </section>

        <section className="inicio__ancho inicio__cierre" aria-labelledby="titulo-cierre">
          <div><p className="inicio__antetitulo">AQUÍ COMIENZA TU CAMINO</p><h2 id="titulo-cierre">Un pequeño paso hoy.<br />Más bienestar mañana.</h2><p>Haz espacio para ti. Nosotros te acompañamos a empezar.</p></div>
          <Link to="/registro" className="boton boton--principal boton--compacto">Crear mi cuenta <Icono nombre="flecha" /></Link>
        </section>
      </main>

      <footer className="inicio__pie">
        <div className="inicio__ancho inicio__pie-contenido"><div><Logo /><p>Salud, deporte y bienestar.<br />Más cerca de ti.</p></div><nav aria-label="Enlaces del pie de página"><a href="#conoce-fitsearch">Conoce FitSearch</a><a href="#como-empezar">Cómo empezar</a><Link to="/iniciar-sesion">Iniciar sesión</Link></nav><p className="inicio__aviso-salud">FitSearch entrega orientación general y no reemplaza la atención de un profesional de salud.</p></div>
        <div className="inicio__ancho inicio__creditos"><span>© {new Date().getFullYear()} FitSearch</span><span>Proyecto Capstone · Duoc UC</span></div>
      </footer>
    </div>
  );
}

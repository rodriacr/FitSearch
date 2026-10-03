import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Alerta from '../components/Alerta.jsx';
import Icono from '../components/Icono.jsx';
import { Logo } from '../components/PantallaAcceso.jsx';
import { useSesion } from '../context/SesionContext.jsx';
import './Portada.css';

const CATEGORIAS = [
  { icono: 'profesional', nombre: 'Profesionales', detalle: 'de la salud y el deporte' },
  { icono: 'hospital', nombre: 'Centros de salud', detalle: 'y clínicas' },
  { icono: 'mancuerna', nombre: 'Gimnasios', detalle: 'y centros deportivos' },
  { icono: 'pastilla', nombre: 'Farmacias', detalle: 'y más' },
];

const AREAS = [
  { icono: 'corazon', nombre: 'Salud y bienestar', texto: 'Dale espacio a tu bienestar físico y emocional.' },
  { icono: 'actividad', nombre: 'Deporte y movimiento', texto: 'Encuentra tu ritmo y avanza hacia tus objetivos.' },
  { icono: 'balanza', nombre: 'Alimentación', texto: 'Conoce tus necesidades y construye mejores hábitos.' },
];

const OFERTA = [
  { icono: 'profesional', nombre: 'Profesionales', texto: 'Busca nutricionistas, kinesiólogos, entrenadores y más. Filtra por comuna, modalidad, distancia y calificación, y lee las reseñas de otras personas.', disponible: true },
  { icono: 'hospital', nombre: 'Centros de salud', texto: 'Encuentra centros de salud y clínicas cerca de ti.' },
  { icono: 'mancuerna', nombre: 'Gimnasios', texto: 'Descubre gimnasios y centros deportivos para entrenar a tu ritmo.' },
  { icono: 'pastilla', nombre: 'Farmacias', texto: 'Ubica farmacias cercanas cuando las necesites.' },
  { icono: 'chispa', nombre: 'Asistente IA', texto: 'Un asistente que te orienta y te recomienda qué tipo de profesional buscar.' },
];

// Portada pública, solo para invitados: con sesión iniciada App redirige al Inicio (FS-HU-20, DAS D20).
// Las funciones futuras se presentan como "Próximamente", sin simular servicios ni resultados.
export default function Portada() {
  const { aviso: avisoSesion, limpiarAviso } = useSesion();
  // El aviso de cierre de sesión se muestra una sola vez: la portada lo conserva y lo descarta del contexto
  // para que no reaparezca en otra pantalla (seguro con StrictMode, que repite los efectos en desarrollo).
  const [aviso] = useState(avisoSesion);
  useEffect(() => { limpiarAviso(); }, [limpiarAviso]);

  return (
    <div className="portada">
      <a className="portada__saltar" href="#contenido">Saltar al contenido</a>
      <header className="portada__encabezado">
        <div className="portada__ancho portada__barra">
          <Link to="/" className="portada__marca" aria-label="FitSearch, portada"><Logo /></Link>
          <nav className="portada__navegacion" aria-label="Navegación principal">
            <a href="#que-ofrecemos">Qué ofrecemos</a>
            <a href="#como-funciona">Cómo funciona</a>
          </nav>
          <div className="portada__accesos">
            <Link to="/iniciar-sesion" className="portada__enlace-acceso">Iniciar sesión</Link>
            <Link to="/registro" className="boton boton--compacto">Registrarse <Icono nombre="flecha" tamano={18} /></Link>
          </div>
        </div>
      </header>

      <main id="contenido" tabIndex={-1}>
        <section className="portada__hero" aria-labelledby="titulo-portada">
          <div className="portada__ancho portada__hero-grilla">
            <div className="portada__presentacion">
              {aviso && <Alerta tipo={aviso.tipo}>{aviso.texto}</Alerta>}
              <p className="portada__antetitulo"><span /> SALUD · DEPORTE · BIENESTAR</p>
              <h1 id="titulo-portada">Tu salud y bienestar, <span>en un solo lugar</span></h1>
              <p className="portada__introduccion">Encuentra profesionales de la salud y el deporte cerca de ti. Muy pronto también centros de salud, gimnasios, farmacias y un asistente con inteligencia artificial.</p>
              <div className="portada__acciones">
                <Link to="/registro" className="boton boton--principal boton--compacto">Registrarse <Icono nombre="flecha" /></Link>
                <Link to="/iniciar-sesion" className="boton boton--compacto portada__boton-claro">Iniciar sesión</Link>
              </div>
              <p className="portada__nota"><Icono nombre="check" tamano={17} /> A tu ritmo. Con tus propios objetivos.</p>
            </div>
            <ul className="portada__categorias" aria-label="Lo que encontrarás en FitSearch">
              {CATEGORIAS.map(({ icono, nombre, detalle }) => (
                <li key={nombre}><span><Icono nombre={icono} tamano={24} /></span><p><strong>{nombre}</strong> {detalle}</p></li>
              ))}
            </ul>
          </div>
          <svg className="portada__ola" viewBox="0 0 1440 120" preserveAspectRatio="none" aria-hidden="true">
            <path d="M0 70 C320 140 620 0 960 50 S1300 110 1440 60 L1440 120 L0 120 Z" className="ola--naranja" />
            <path d="M0 95 C360 150 700 40 1040 85 S1340 120 1440 95 L1440 120 L0 120 Z" fill="#ffffff" />
          </svg>
        </section>

        <section className="portada__areas portada__ancho" aria-label="Áreas de bienestar">
          {AREAS.map(({ icono, nombre, texto }) => (
            <div className="portada__area" key={nombre}><span className="portada__icono-area"><Icono nombre={icono} tamano={26} /></span><div><h2>{nombre}</h2><p>{texto}</p></div></div>
          ))}
        </section>

        <section id="que-ofrecemos" className="portada__seccion portada__ancho" aria-labelledby="titulo-oferta">
          <div className="portada__titulo-seccion"><p className="portada__antetitulo">QUÉ OFRECE FITSEARCH</p><h2 id="titulo-oferta">Todo lo que necesitas para cuidarte, en un mismo lugar.</h2><p>Empieza hoy buscando profesionales. Estamos construyendo el resto de las secciones.</p></div>
          <div className="portada__herramientas">
            {OFERTA.map(({ icono, nombre, texto, disponible }) => (
              <article key={nombre} className={`portada__herramienta${disponible ? ' portada__herramienta--disponible' : ''}`}>
                <div className="portada__herramienta-superior"><span className="portada__icono-herramienta"><Icono nombre={icono} tamano={26} /></span><span className={`portada__estado${disponible ? ' portada__estado--disponible' : ''}`}>{disponible ? 'Disponible' : 'Próximamente'}</span></div>
                <h3>{nombre}</h3><p>{texto}</p>
                {disponible && <Link to="/registro" className="portada__enlace">Crear mi cuenta <Icono nombre="flecha" tamano={18} /></Link>}
              </article>
            ))}
          </div>
        </section>

        <section id="como-funciona" className="portada__pasos-fondo" aria-labelledby="titulo-pasos">
          <div className="portada__ancho portada__seccion portada__pasos-contenido">
            <div className="portada__titulo-seccion"><p className="portada__antetitulo">CÓMO FUNCIONA</p><h2 id="titulo-pasos">Tres pasos para empezar a cuidarte.</h2><p>No necesitas tener todo resuelto. Comienza por lo que importa: tú.</p><Link to="/registro" className="portada__enlace">Quiero comenzar <Icono nombre="flecha" tamano={18} /></Link></div>
            <ol className="portada__pasos">
              <li><span>01</span><div><h3>Crea tu cuenta</h3><p>Regístrate con tu correo o con tu cuenta de Google.</p></div></li>
              <li><span>02</span><div><h3>Completa tu perfil</h3><p>Elige tu tipo de cuenta y cuéntanos tus datos, tus objetivos y tu información de salud.</p></div></li>
              <li><span>03</span><div><h3>Encuentra apoyo</h3><p>Busca profesionales cerca de ti, revisa sus reseñas y guarda tus favoritos.</p></div></li>
            </ol>
          </div>
        </section>

        <section className="portada__ancho portada__cierre" aria-labelledby="titulo-cierre">
          <div><p className="portada__antetitulo">AQUÍ COMIENZA TU CAMINO</p><h2 id="titulo-cierre">Un pequeño paso hoy.<br />Más bienestar mañana.</h2><p>Haz espacio para ti. Nosotros te acompañamos a empezar.</p></div>
          <Link to="/registro" className="boton boton--principal boton--compacto">Registrarse <Icono nombre="flecha" /></Link>
        </section>
      </main>

      <footer className="portada__pie">
        <div className="portada__ancho portada__pie-contenido"><div><Logo /><p>Salud, deporte y bienestar.<br />Más cerca de ti.</p></div><nav aria-label="Enlaces del pie de página"><a href="#que-ofrecemos">Qué ofrecemos</a><a href="#como-funciona">Cómo funciona</a><Link to="/iniciar-sesion">Iniciar sesión</Link><Link to="/registro">Registrarse</Link></nav><p className="portada__aviso-salud">FitSearch entrega orientación general y no reemplaza la atención de un profesional de salud.</p></div>
        <div className="portada__ancho portada__creditos"><span>© {new Date().getFullYear()} FitSearch</span><span>Proyecto Capstone · Duoc UC</span></div>
      </footer>
    </div>
  );
}

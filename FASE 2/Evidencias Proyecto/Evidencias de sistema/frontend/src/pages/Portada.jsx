import useAnimacionesScroll from '../services/useAnimacionesScroll.js';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import reglas from '@shared/reglas.json';
import Especialidades from '../components/inicio/Especialidades.jsx';
import fotoPortada from '../assets/inicio/bienestar-parque.webp';
import Alerta from '../components/Alerta.jsx';
import Icono from '../components/Icono.jsx';
import { Logo } from '../components/PantallaAcceso.jsx';
import { useSesion } from '../context/SesionContext.jsx';
import './Portada.css';
import './PortadaRedisenada.css';

const AREAS = [
  { icono: 'corazon', nombre: 'Salud y bienestar', texto: 'Dale espacio a tu bienestar físico y emocional.' },
  { icono: 'actividad', nombre: 'Deporte y movimiento', texto: 'Encuentra tu ritmo y avanza hacia tus objetivos.' },
  { icono: 'balanza', nombre: 'Alimentación', texto: 'Conoce tus necesidades y construye mejores hábitos.' },
];

const OFERTA = [
  { icono: 'profesional', nombre: 'Profesionales', texto: 'Busca nutricionistas, kinesiólogos, entrenadores y más. Filtra por comuna, modalidad, distancia y calificación, y lee las reseñas de otras personas.', disponible: true },
  { icono: 'hospital', nombre: 'Centros de salud', texto: 'Encuentra centros de salud y clínicas cerca de ti.' },
  { icono: 'mancuerna', nombre: 'Gimnasios', texto: 'Descubre gimnasios y centros deportivos para entrenar a tu ritmo.' },
  { icono: 'comida', nombre: 'Comidas', texto: 'Anota lo que comes y sigue tus calorías y macronutrientes del día, la semana y el mes.' },
  { icono: 'chispa', nombre: 'Asistente IA', texto: 'Recibe orientación general y explora qué profesional podría ayudarte.', disponible: true },
];

// Portada pública, solo para invitados: con sesión iniciada App redirige al Inicio (FS-HU-20, DAS D20).
// Las funciones futuras se presentan como "Próximamente", sin simular servicios ni resultados.
export default function Portada() {
  const animaciones = useAnimacionesScroll();
  const { aviso: avisoSesion, limpiarAviso } = useSesion();
  // El aviso de cierre de sesión se muestra una sola vez: la portada lo conserva y lo descarta del contexto
  // para que no reaparezca en otra pantalla (seguro con StrictMode, que repite los efectos en desarrollo).
  const [aviso] = useState(avisoSesion);
  const navegar = useNavigate();
  useEffect(() => { limpiarAviso(); }, [limpiarAviso]);

  function buscar(evento) {
    evento.preventDefault();
    const datos = new FormData(evento.currentTarget);
    const parametros = new URLSearchParams();
    for (const clave of ['especialidad', 'comuna']) {
      const valor = datos.get(clave).trim();
      if (valor) parametros.set(clave, valor);
    }
    // El acceso protegido recuerda los filtros hasta después de iniciar sesión.
    navegar(`/profesionales${parametros.size ? `?${parametros}` : ''}`);
  }

  return (
    <div className="portada" ref={animaciones}>
      <a className="portada__saltar" href="#contenido">Saltar al contenido</a>
      <header className="portada__encabezado">
        <div className="portada__ancho portada__barra">
          <Link to="/" className="portada__marca" aria-label="FitSearch, portada"><Logo /></Link>
          <nav className="portada__navegacion" aria-label="Navegación principal">
            <a href="#especialidades">Especialidades</a><a href="#que-ofrecemos">Qué ofrecemos</a>
            <a href="#como-funciona">Cómo funciona</a>
          </nav>
          <div className="portada__accesos">
            <Link to="/iniciar-sesion" className="portada__enlace-acceso">Iniciar sesión</Link>
            <Link to="/registro" className="boton boton--principal boton--compacto">Crear cuenta <Icono nombre="flecha" tamano={18} /></Link>
          </div>
        </div>
      </header>

      <main id="contenido" tabIndex={-1}>
        <section className="portada__hero portada__ancho" aria-labelledby="titulo-portada">
          <img data-paralaje className="portada__foto" src={fotoPortada} width={1440} height={960} alt="" fetchPriority="high" />
          <div data-revelar className="portada__presentacion">
            {aviso && <Alerta tipo={aviso.tipo}>{aviso.texto}</Alerta>}
            <p className="portada__antetitulo">SALUD · DEPORTE · BIENESTAR</p>
            <h1 id="titulo-portada">Tu bienestar,<br /><span>a tu ritmo.</span></h1>
            <p className="portada__introduccion">Conecta con profesionales de la salud y el deporte cerca de ti.</p>
            <div className="portada__acciones">
              <Link to="/profesionales" className="boton boton--principal">Encuentra tu profesional <Icono nombre="flecha" tamano={19} /></Link>
              <a href="#como-funciona" className="portada__conocer">Conoce FitSearch <span><Icono nombre="flecha" tamano={16} /></span></a>
            </div>
          </div>
        </section>
        <section data-revelar className="portada__busqueda portada__ancho" aria-labelledby="titulo-busqueda-portada">
          <div><h2 id="titulo-busqueda-portada">¿Qué necesitas hoy?</h2><p>Encuentra profesionales cerca de ti.</p></div>
          <form role="search" aria-label="Buscar profesionales por especialidad y comuna" onSubmit={buscar}>
            <label className="portada__filtro"><Icono nombre="medico" tamano={24} /><span><span>Especialidad</span>
              <select name="especialidad" aria-label="Especialidad"><option value="">Todas las especialidades</option>
                {reglas.profesionales.especialidades.map((nombre) => <option key={nombre}>{nombre}</option>)}
              </select></span></label>
            <label className="portada__filtro"><Icono nombre="pin" tamano={24} /><span><span>Comuna</span>
              <input name="comuna" aria-label="Comuna" placeholder="Ej. Ñuñoa" maxLength={reglas.profesionales.comuna.max} />
            </span></label>
            <button className="boton boton--principal"><Icono nombre="buscar" tamano={20} /> Buscar profesionales</button>
          </form>
        </section>
        <section id="especialidades" className="portada__seccion portada__ancho" aria-labelledby="titulo-especialidades">
          <div data-revelar className="portada__titulo-seccion">
            <div><p className="portada__antetitulo">APOYO PARA CADA ETAPA DE TU VIDA</p><h2 id="titulo-especialidades">El apoyo que necesitas,<br />en un solo lugar.</h2></div>
            <p>Desde cuidar tus hábitos hasta encontrar tu próximo desafío. Explora las especialidades y elige a quién consultar.</p>
          </div>
          <Especialidades />
          <Link to="/profesionales" className="portada__enlace portada__ver-especialidades">Ver todas las especialidades <Icono nombre="flecha" tamano={18} /></Link>
        </section>



        <section id="que-ofrecemos" className="portada__seccion portada__ancho" aria-labelledby="titulo-oferta">
          <div data-revelar className="portada__titulo-seccion"><p className="portada__antetitulo">QUÉ OFRECE FITSEARCH</p><h2 id="titulo-oferta">Más herramientas para tu bienestar.</h2><p>Comienza con nuestros profesionales y el asistente. Seguimos construyendo nuevos espacios para ti.</p></div>
          <div className="portada__herramientas">
            {OFERTA.map(({ icono, nombre, texto, disponible }, indice) => (
              <article data-revelar data-revelar-retardo={indice * 70} key={nombre} className={`portada__herramienta${disponible ? ' portada__herramienta--disponible' : ''}`}>
                <div className="portada__herramienta-superior"><span className="portada__icono-herramienta"><Icono nombre={icono} tamano={26} /></span><span className={`portada__estado${disponible ? ' portada__estado--disponible' : ''}`}>{disponible ? 'Disponible' : 'Próximamente'}</span></div>
                <h3>{nombre}</h3><p>{texto}</p>
                {disponible && <Link to={nombre === 'Asistente IA' ? '/asistente' : '/profesionales'} className="portada__enlace">Explorar <Icono nombre="flecha" tamano={18} /></Link>}
              </article>
            ))}
          </div>
        </section>

        <section id="como-funciona" className="portada__pasos-fondo" aria-labelledby="titulo-pasos">
          <div className="portada__ancho portada__seccion portada__pasos-contenido">
            <div data-revelar className="portada__titulo-seccion"><p className="portada__antetitulo">CÓMO FUNCIONA</p><h2 id="titulo-pasos">Empieza a cuidarte en tres pasos</h2><p>No necesitas tener todo resuelto. Comienza por lo que importa: tú.</p><Link to="/registro" className="portada__enlace">Quiero comenzar <Icono nombre="flecha" tamano={18} /></Link></div>
            <ol className="portada__pasos">
              <li data-revelar><span>01</span><div><h3>Crea tu cuenta</h3><p>Regístrate con tu correo o con tu cuenta de Google.</p></div></li>
              <li data-revelar><span>02</span><div><h3>Completa tu perfil</h3><p>Elige tu tipo de cuenta y cuéntanos tus datos, tus objetivos y tu información de salud.</p></div></li>
              <li data-revelar><span>03</span><div><h3>Encuentra apoyo</h3><p>Busca profesionales cerca de ti, revisa sus reseñas y guarda tus favoritos.</p></div></li>
            </ol>
          </div>
        </section>

        <section data-revelar className="portada__areas portada__ancho" aria-label="Áreas de bienestar">
          {AREAS.map(({ icono, nombre, texto }) => (
            <div className="portada__area" key={nombre}><span className="portada__icono-area"><Icono nombre={icono} tamano={26} /></span><div><h2>{nombre}</h2><p>{texto}</p></div></div>
          ))}
        </section>

        <section data-revelar className="portada__ancho portada__cierre" aria-labelledby="titulo-cierre">
          <div><p className="portada__antetitulo">AQUÍ COMIENZA TU CAMINO</p><h2 id="titulo-cierre">Un pequeño paso hoy.<br /><span>Más bienestar mañana.</span></h2><p>Haz espacio para ti. Nosotros te acompañamos a empezar.</p></div>
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

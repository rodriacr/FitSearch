import useAnimacionesScroll from '../services/useAnimacionesScroll.js';
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import reglas from '@shared/reglas.json';
import Especialidades from '../components/inicio/Especialidades.jsx';
import HeroBienestar from '../components/inicio/HeroBienestar.jsx';
import Despedida from '../components/Despedida.jsx';
import Icono from '../components/Icono.jsx';
import iconoMarca from '../assets/logo-fitsearch-icono.png';
import { useSesion } from '../context/SesionContext.jsx';
import './Portada.css';
import './PortadaRedisenada.css';

function MarcaPortada() {
  return (
    <span className="portada__logotipo" role="img" aria-label="FitSearch — Plataforma inteligente de salud, deporte y bienestar">
      <img src={iconoMarca} alt="" width={44} height={44} />
      <span>Fit<span>Search</span></span>
    </span>
  );
}

const OFERTA = [
  { icono: 'profesional', nombre: 'Profesionales', texto: 'Explora especialidades, reseñas y profesionales cerca de ti.', disponible: true },
  { icono: 'hospital', nombre: 'Centros de salud', texto: 'Encuentra centros de salud y clínicas cerca de ti.' },
  { icono: 'mancuerna', nombre: 'Gimnasios', texto: 'Descubre gimnasios y centros deportivos para entrenar a tu ritmo.' },
  { icono: 'comida', nombre: 'Comidas', texto: 'Registro de alimentación y hábitos para tu bienestar.' },
  { icono: 'chispa', nombre: 'Asistente IA', texto: 'Orientación e historial para continuar tus consultas.', disponible: true },
];

// Portada pública, solo para invitados: con sesión iniciada App redirige al Inicio (FS-HU-20, DAS D20).
// Las funciones futuras se presentan como "Próximamente", sin simular servicios ni resultados.
export default function Portada() {
  const animaciones = useAnimacionesScroll();
  const { aviso: avisoSesion, limpiarAviso } = useSesion();
  // El aviso de cierre de sesión se muestra una sola vez: la portada lo conserva y lo descarta del contexto
  // para que no reaparezca en otra pantalla (seguro con StrictMode, que repite los efectos en desarrollo).
  const [aviso, setAviso] = useState(avisoSesion);
  const navegar = useNavigate();
  useEffect(() => { limpiarAviso(); }, [limpiarAviso]);
  const cerrarDespedida = useCallback(() => setAviso(null), []);
  const esDespedida = aviso?.origen === 'cierre';

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
      {esDespedida && <Despedida nombre={aviso.nombre} texto={aviso.texto} onCerrar={cerrarDespedida} />}
      <a className="portada__saltar" href="#contenido">Saltar al contenido</a>
      <header className="portada__encabezado">
        <div className="portada__ancho portada__barra">
          <Link to="/" className="portada__marca" aria-label="FitSearch, portada"><MarcaPortada /></Link>
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
        <HeroBienestar aviso={esDespedida ? null : aviso} />
        <div className="portada__contenido">
        <section id="explorar-fitsearch" tabIndex={-1} data-revelar className="portada__busqueda portada__ancho" aria-labelledby="titulo-busqueda-portada">
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
            <div><p className="portada__antetitulo">APOYO PARA CADA ETAPA DE TU VIDA</p><h2 id="titulo-especialidades">El apoyo que necesitas,<br /><span>en un solo lugar.</span></h2></div>
            <p>Desde cuidar tus hábitos hasta encontrar tu próximo desafío. Explora las especialidades y elige a quién consultar.</p>
          </div>
          <Especialidades />
          <Link to="/profesionales" className="portada__enlace portada__ver-especialidades">Ver todas las especialidades <Icono nombre="flecha" tamano={18} /></Link>
        </section>



        <section data-revelar className="portada__asistente portada__ancho" aria-labelledby="titulo-asistente-portada">
          <div className="portada__asistente-texto">
            <p className="portada__antetitulo"><Icono nombre="chispa" tamano={20} /> ASISTENTE IA</p>
            <h2 id="titulo-asistente-portada">Tu camino continúa.<br /><span>Con apoyo, paso a paso.</span></h2>
            <p>Conversa sobre tus objetivos, revisa tu historial y retoma tus consultas cuando lo necesites.</p>
            <Link to="/asistente" className="boton boton--principal">Conoce al asistente IA <Icono nombre="flecha" tamano={18} /></Link>
          </div>
          <ul className="portada__asistente-beneficios">
            <li><span><Icono nombre="chispa" tamano={24} /></span><div><h3>Orientación</h3><p>Según tus consultas</p></div></li>
            <li><span><Icono nombre="chat" tamano={24} /></span><div><h3>Historial de consultas</h3><p>Retoma tus conversaciones guardadas</p></div></li>
            <li><span><Icono nombre="profesional" tamano={24} /></span><div><h3>Especialidades recomendadas</h3><p>Encuentra el apoyo adecuado para ti</p></div></li>
          </ul>
        </section>

        <section id="como-funciona" className="portada__pasos-fondo" aria-labelledby="titulo-pasos">
          <div className="portada__ancho portada__seccion portada__pasos-contenido">
            <div data-revelar className="portada__titulo-seccion"><p className="portada__antetitulo">CÓMO FUNCIONA</p><h2 id="titulo-pasos">Empieza a cuidarte <span>en tres pasos</span></h2><p>No necesitas tener todo resuelto. Comienza por lo que importa: tú.</p><Link to="/registro" className="portada__enlace">Quiero comenzar <Icono nombre="flecha" tamano={18} /></Link></div>
            <ol className="portada__pasos">
              <li data-revelar><span>01</span><div><h3>Crea tu cuenta</h3><p>Regístrate con tu correo o con tu cuenta de Google.</p></div></li>
              <li data-revelar><span>02</span><div><h3>Completa tu perfil</h3><p>Elige tu tipo de cuenta y completa el perfil correspondiente para comenzar.</p></div></li>
              <li data-revelar><span>03</span><div><h3>Encuentra apoyo</h3><p>Busca profesionales cerca de ti, revisa sus reseñas y guarda tus favoritos.</p></div></li>
            </ol>
          </div>
        </section>

        <section id="que-ofrecemos" className="portada__seccion portada__ancho" aria-labelledby="titulo-oferta">
          <div data-revelar className="portada__titulo-seccion"><p className="portada__antetitulo">QUÉ OFRECE FITSEARCH</p><h2 id="titulo-oferta">Más herramientas <span>para tu bienestar.</span></h2><p>Comienza con nuestros profesionales y el asistente. Seguimos construyendo nuevos espacios para ti.</p></div>
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

        </div>
      </main>

      <footer className="portada__pie">
        <div className="portada__ancho portada__pie-contenido"><div><MarcaPortada /><p>Salud, deporte y bienestar.<br />Más cerca de ti.</p></div><nav aria-label="Enlaces del pie de página"><a href="#que-ofrecemos">Qué ofrecemos</a><a href="#como-funciona">Cómo funciona</a><Link to="/iniciar-sesion">Iniciar sesión</Link><Link to="/registro">Registrarse</Link></nav><p className="portada__aviso-salud">FitSearch entrega orientación general y no reemplaza la atención de un profesional de salud.</p></div>
        <div className="portada__ancho portada__creditos"><span>© {new Date().getFullYear()} FitSearch</span><span>Proyecto Capstone · Duoc UC</span></div>
      </footer>
    </div>
  );
}

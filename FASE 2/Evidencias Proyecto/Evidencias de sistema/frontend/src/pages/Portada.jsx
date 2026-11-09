import useAnimacionesScroll from '../services/useAnimacionesScroll.js';
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import reglas from '@shared/reglas.json';
import VitrinaObjetivos from '../components/inicio/VitrinaObjetivos.jsx';
import HeroBienestar from '../components/inicio/HeroBienestar.jsx';
import ParaProfesionales from '../components/inicio/ParaProfesionales.jsx';
import CintaMovimiento from '../components/inicio/CintaMovimiento.jsx';
import EncabezadoPortada from '../components/inicio/EncabezadoPortada.jsx';
import BotonSubir from '../components/inicio/BotonSubir.jsx';
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

// Cada herramienta disponible lleva a su propia sección; sin sesión, primero pasa por el inicio de sesión y después
// vuelve a ella. Sin destino, se muestra como «Próximamente».
const OFERTA = [
  { icono: 'profesional', nombre: 'Profesionales', texto: 'Explora especialidades, reseñas y profesionales cerca de ti.', destino: '/profesionales' },
  { icono: 'hospital', nombre: 'Centros de salud', texto: 'Encuentra centros de salud y clínicas cerca de ti.' },
  { icono: 'mancuerna', nombre: 'Gimnasios', texto: 'Descubre gimnasios y centros deportivos para entrenar a tu ritmo.' },
  { icono: 'comida', nombre: 'Comidas', texto: 'Registra lo que comes con sus gramos y sigue tus calorías y macronutrientes del día.', destino: '/comidas' },
  { icono: 'chispa', nombre: 'Asistente IA', texto: 'Orientación e historial para continuar tus consultas.', destino: '/asistente' },
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
      <EncabezadoPortada marca={<MarcaPortada />} />

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
        <CintaMovimiento />
        <section id="especialidades" className="portada__seccion portada__ancho" aria-labelledby="titulo-especialidades">
          <div data-revelar className="portada__titulo-seccion">
            <h2 id="titulo-especialidades">El apoyo que necesitas,<br /><span>en un solo lugar.</span></h2>
            <p>Desde cuidar tus hábitos hasta encontrar tu próximo desafío. Explora las especialidades y elige a quién consultar.</p>
          </div>
          <VitrinaObjetivos />
          <Link to="/profesionales" className="portada__enlace portada__ver-especialidades">Ver todas las especialidades <Icono nombre="flecha" tamano={18} /></Link>
        </section>



        {/* En vez de repetir los beneficios del hero, la sección muestra cómo se ve una conversación: la tarjeta de
            especialidad (FS-HU-08) y los alimentos agregados a Comidas (FS-HU-09) son las respuestas reales del asistente. */}
        <section data-revelar className="portada__asistente portada__ancho" aria-labelledby="titulo-asistente-portada">
          <div className="portada__asistente-texto">
            <h2 id="titulo-asistente-portada">Pregunta como hablas.<br /><span>El asistente te orienta.</span></h2>
            <p>Cuéntale qué te pasa o qué quieres lograr. Te sugiere qué especialista consultar, registra tus comidas por ti y guarda la conversación para retomarla cuando vuelvas.</p>
            <Link to="/asistente" className="boton boton--principal">Conoce al asistente IA <Icono nombre="flecha" tamano={18} /></Link>
            <p className="portada__asistente-nota">Orientación general: no reemplaza la atención de un profesional de salud.</p>
          </div>
          <figure className="portada__conversacion" data-escena aria-label="Ejemplo de conversación con el asistente">
            <figcaption><span className="portada__conversacion-avatar"><Icono nombre="chispa" tamano={18} /></span> Asistente FitSearch <span className="portada__conversacion-ejemplo">Ejemplo</span></figcaption>
            <p className="portada__mensaje portada__mensaje--persona">Me duele la rodilla cuando salgo a trotar. ¿A quién debería consultar?</p>
            <div className="portada__mensaje portada__mensaje--asistente">
              <p>Si el dolor aparece al trotar y no cede con unos días de descanso, conviene que te evalúe un kinesiólogo: revisará cómo pisas y qué ejercicios te ayudan.</p>
              <Link to="/profesionales?especialidad=Kinesiolog%C3%ADa" className="portada__mensaje-tarjeta"><Icono nombre="profesional" tamano={18} /> Ver profesionales de Kinesiología <Icono nombre="flecha" tamano={16} /></Link>
            </div>
            <p className="portada__mensaje portada__mensaje--persona">Agrega 150 g de avena a mi desayuno.</p>
            <div className="portada__mensaje portada__mensaje--asistente">
              <span className="portada__mensaje-tarjeta portada__mensaje-tarjeta--comida"><Icono nombre="check" tamano={18} /> Agregado a tus comidas de hoy: avena, 150 g, desayuno</span>
            </div>
          </figure>
        </section>

        <ParaProfesionales />

        <section id="como-funciona" className="portada__pasos-fondo" aria-labelledby="titulo-pasos">
          <div className="portada__ancho portada__seccion portada__pasos-contenido">
            <div data-revelar className="portada__titulo-seccion"><h2 id="titulo-pasos">Empieza a cuidarte <span>en tres pasos</span></h2><p>No necesitas tener todo resuelto. Comienza por lo que importa: tú.</p><Link to="/registro" className="portada__enlace">Quiero comenzar <Icono nombre="flecha" tamano={18} /></Link></div>
            <ol className="portada__pasos" data-escena>
              <li data-revelar><span>01</span><div><h3>Crea tu cuenta</h3><p>Regístrate con tu correo o con tu cuenta de Google.</p></div></li>
              <li data-revelar><span>02</span><div><h3>Completa tu perfil</h3><p>Elige tu tipo de cuenta y completa el perfil correspondiente para comenzar.</p></div></li>
              <li data-revelar><span>03</span><div><h3>Encuentra apoyo</h3><p>Busca profesionales cerca de ti, revisa sus reseñas y guarda tus favoritos.</p></div></li>
            </ol>
          </div>
        </section>

        <section id="que-ofrecemos" className="portada__seccion portada__ancho" aria-labelledby="titulo-oferta">
          <div data-revelar className="portada__titulo-seccion"><h2 id="titulo-oferta">Más herramientas <span>para tu bienestar.</span></h2><p>Comienza con nuestros profesionales y el asistente. Seguimos construyendo nuevos espacios para ti.</p></div>
          <div className="portada__herramientas">
            {OFERTA.map(({ icono, nombre, texto, destino }, indice) => (
              <article data-revelar data-revelar-retardo={indice * 70} key={nombre} className={`portada__herramienta${destino ? ' portada__herramienta--disponible' : ''}`}>
                <div className="portada__herramienta-superior"><span className="portada__icono-herramienta"><Icono nombre={icono} tamano={26} /></span><span className={`portada__estado${destino ? ' portada__estado--disponible' : ''}`}>{destino ? 'Disponible' : 'Próximamente'}</span></div>
                <h3>{nombre}</h3><p>{texto}</p>
                {destino && <Link to={destino} className="portada__enlace">Explorar <Icono nombre="flecha" tamano={18} /></Link>}
              </article>
            ))}
          </div>
        </section>

        </div>
      </main>

      <footer className="portada__pie">
        <div className="portada__ancho portada__pie-contenido"><div><MarcaPortada /><p>Salud, deporte y bienestar.<br />Más cerca de ti.</p></div><nav aria-label="Enlaces del pie de página"><a href="#que-ofrecemos">Qué ofrecemos</a><a href="#como-funciona">Cómo funciona</a><a href="#para-profesionales">Para profesionales</a><Link to="/iniciar-sesion">Iniciar sesión</Link><Link to="/registro">Registrarse</Link></nav><p className="portada__aviso-salud">FitSearch entrega orientación general y no reemplaza la atención de un profesional de salud.</p></div>
        <div className="portada__ancho portada__creditos"><span>© {new Date().getFullYear()} FitSearch</span><span>Proyecto Capstone · Duoc UC</span></div>
      </footer>
      <BotonSubir />
    </div>
  );
}

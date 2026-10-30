import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Alerta from '../Alerta.jsx';
import Icono from '../Icono.jsx';
import centro from '../../assets/inicio/centro-bienestar.webp';
import './HeroBienestar.css';

const limitar = (valor) => Math.max(0, Math.min(1, valor));
const CONSULTA_ESTATICA = '(prefers-reduced-motion: reduce), (max-height: 600px)';
const movimientoPermitido = () => Boolean(window.matchMedia && !window.matchMedia(CONSULTA_ESTATICA).matches);

export default function HeroBienestar({ aviso }) {
  const escena = useRef(null);
  const [animado, setAnimado] = useState(movimientoPermitido);
  const [paso, setPaso] = useState(0);

  useEffect(() => {
    if (!window.matchMedia) return;
    const preferencia = window.matchMedia(CONSULTA_ESTATICA);
    const cambiar = () => setAnimado(!preferencia.matches);
    preferencia.addEventListener('change', cambiar);
    return () => preferencia.removeEventListener('change', cambiar);
  }, []);

  useEffect(() => {
    if (!animado || !escena.current) return;
    const raiz = escena.current;
    let cuadro = null;
    function actualizar() {
      cuadro = null;
      const limites = raiz.getBoundingClientRect();
      const progreso = limitar(-limites.top / Math.max(1, limites.height - window.innerHeight));
      const apertura = limitar((progreso - 0.05) / 0.5);
      raiz.style.setProperty('--apertura', apertura);
      raiz.style.setProperty('--avance', progreso);
      setPaso(progreso < 0.38 ? 0 : progreso < 0.72 ? 1 : 2);
    }
    function solicitar() {
      if (cuadro === null) cuadro = window.requestAnimationFrame(actualizar);
    }
    window.addEventListener('scroll', solicitar, { passive: true });
    window.addEventListener('resize', solicitar);
    actualizar();
    return () => {
      window.removeEventListener('scroll', solicitar);
      window.removeEventListener('resize', solicitar);
      if (cuadro !== null) window.cancelAnimationFrame(cuadro);
      raiz.style.removeProperty('--apertura');
      raiz.style.removeProperty('--avance');
    };
  }, [animado]);

  const atributos = (indice) => ({
    'aria-hidden': animado && paso !== indice ? true : undefined,
    inert: animado && paso !== indice ? true : undefined,
    'data-activo': !animado || paso === indice,
  });

  return (
    <section ref={escena} className={`hero-bienestar${animado ? ' hero-bienestar--animado' : ''}`}
      aria-label="Explora el bienestar con FitSearch">
      <div className="hero-bienestar__escena">
        <img className="hero-bienestar__interior" src={centro} alt="" width={1536} height={1024} fetchPriority="high" />
        <div className="hero-bienestar__sombra" aria-hidden="true" />
        <div className="hero-bienestar__puertas" aria-hidden="true">
          <div className="hero-bienestar__puerta hero-bienestar__puerta--izquierda"><span /></div>
          <div className="hero-bienestar__puerta hero-bienestar__puerta--derecha"><span /></div>
        </div>
        <div className="hero-bienestar__superior">
          <span><span className="hero-bienestar__punto" /> TU ESPACIO DE BIENESTAR DIGITAL</span>
          <a href="#explorar-fitsearch">Ir al buscador <Icono nombre="flecha" tamano={16} /></a>
        </div>
        {/* El título y el aviso de sesión quedan fuera de los pasos: al avanzar la escena, los pasos inactivos se
            vuelven inert y un lector de pantalla perdía el h1 de la portada y el aviso. El título visible del paso 0
            se oculta al lector para que no se lea dos veces. */}
        <h1 className="solo-lector">Tu bienestar, a tu ritmo.</h1>
        {aviso && <div className="hero-bienestar__aviso"><Alerta tipo={aviso.tipo}>{aviso.texto}</Alerta></div>}
        <div className="hero-bienestar__relato">
          <div className="hero-bienestar__paso hero-bienestar__paso--entrada" {...atributos(0)}>
            <p className="hero-bienestar__ceja">ABRE LA PUERTA A TU BIENESTAR</p>
            <p className="hero-bienestar__titulo" aria-hidden="true">Tu bienestar,<br /><span>a tu ritmo.</span></p>
            <p>Profesionales, orientación y un asistente de IA para acompañar tus objetivos. Todo comienza contigo.</p>
            <Link to="/profesionales" className="boton boton--principal">Encuentra tu profesional <Icono nombre="flecha" tamano={18} /></Link>
            {animado && <p className="hero-bienestar__invitacion">Desliza para abrir el centro <span aria-hidden="true">↓</span></p>}
          </div>
          <div className="hero-bienestar__paso hero-bienestar__paso--especialidades" {...atributos(1)}>
            <p className="hero-bienestar__ceja">DISTINTAS ESPECIALIDADES. UN MISMO PROPÓSITO.</p>
            <h2>Un espacio.<br /><span>Muchas formas de cuidarte.</span></h2>
            <p>Encuentra el apoyo que necesitas para tu alimentación, tu movimiento y tus próximos desafíos.</p>
            <div className="hero-bienestar__especialidades">
              <Link to="/profesionales?especialidad=Nutrici%C3%B3n"><Icono nombre="comida" tamano={21} /> Nutrición</Link>
              <Link to="/profesionales?especialidad=Kinesiolog%C3%ADa"><Icono nombre="actividad" tamano={21} /> Kinesiología</Link>
              <Link to="/profesionales?especialidad=Entrenamiento+personal"><Icono nombre="mancuerna" tamano={21} /> Entrenamiento personal</Link>
            </div>
            <p className="hero-bienestar__nota">Escenario ilustrativo de las especialidades disponibles en FitSearch.</p>
          </div>
          <div className="hero-bienestar__paso hero-bienestar__paso--ia" {...atributos(2)}>
            <span className="hero-bienestar__insignia"><Icono nombre="chispa" tamano={19} /> ASISTENTE IA</span>
            <h2>Tu camino continúa.<br /><span>Con apoyo, paso a paso.</span></h2>
            <p>Conversa sobre tus objetivos, revisa tu historial y retoma tus consultas cuando lo necesites.</p>
            <ul className="hero-bienestar__beneficios">
              <li><Icono nombre="chispa" tamano={20} /> Orientación según tus consultas</li>
              <li><Icono nombre="chispa" tamano={20} /> Conversaciones guardadas para continuar</li>
              <li><Icono nombre="profesional" tamano={20} /> Recomendaciones de especialidades</li>
            </ul>
            <Link to="/asistente" className="boton boton--principal">Conoce al asistente IA <Icono nombre="flecha" tamano={18} /></Link>
            <p className="hero-bienestar__nota">Orientación general que no reemplaza la atención de un profesional de salud.</p>
          </div>
        </div>
        <div className="hero-bienestar__inferior" aria-hidden="true">
          <span>{paso === 0 ? 'Desliza para entrar' : paso === 1 ? 'Sigue explorando' : 'Tu siguiente paso está aquí'} <span>↓</span></span>
          <div className="hero-bienestar__capitulos"><span data-actual={paso === 0}>01 · Bienvenido</span><span data-actual={paso === 1}>02 · Especialidades</span><span data-actual={paso === 2}>03 · Asistente IA</span></div>
        </div>
      </div>
    </section>
  );
}

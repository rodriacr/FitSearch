import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Icono from '../Icono.jsx';
import kinesiologia from '../../assets/inicio/kinesiologia.webp';
import nutricion from '../../assets/inicio/nutricion.webp';
import parque from '../../assets/inicio/bienestar-parque.webp';
import estiramiento from '../../assets/inicio/bienestar-inicio.webp';
import medico from '../../assets/perfil-profesional.webp';
import './VitrinaObjetivos.css';

// Vitrina de la portada: cada objetivo lleva a la especialidad que lo atiende. Las fotografías son ilustraciones
// (assets/inicio/README.md), no profesionales ni pacientes reales.
const OBJETIVOS = [
  { especialidad: 'Kinesiología', objetivo: 'Volver a trotar sin dolor de rodilla', texto: 'Una evaluación de cómo te mueves y ejercicios para recuperar la confianza paso a paso.', imagen: kinesiologia, encuadre: 'center 28%' },
  { especialidad: 'Nutrición', objetivo: 'Comer mejor sin dietas extremas', texto: 'Un plan que calce con tu rutina, tus gustos y lo que quieres lograr.', imagen: nutricion, encuadre: 'center 22%' },
  { especialidad: 'Entrenamiento personal', objetivo: 'Entrenar con alguien que te acompañe', texto: 'Sesiones a tu ritmo, presenciales u online, con un plan que avanza contigo.', imagen: parque, encuadre: '68% center' },
  { especialidad: 'Medicina deportiva', objetivo: 'Volver al deporte después de una lesión', texto: 'Un diagnóstico claro y los pasos para retomar tu actividad sin apuros.', imagen: medico, encuadre: 'center 18%' },
  { especialidad: 'Psicología deportiva', objetivo: 'Mantener la motivación y la constancia', texto: 'Herramientas para manejar la presión, los nervios y los días sin ganas.', imagen: estiramiento, encuadre: '30% center' },
];

const consultaReducida = '(prefers-reduced-motion: reduce)';

export default function VitrinaObjetivos() {
  const raiz = useRef(null);
  const [actual, setActual] = useState(0);
  const [pausada, setPausada] = useState(false);
  const [enEspera, setEnEspera] = useState(false);
  const [fuera, setFuera] = useState(false);
  const [automatica, setAutomatica] = useState(() => Boolean(window.matchMedia && !window.matchMedia(consultaReducida).matches));

  // Con movimiento reducido no rota sola: la persona elige cada objetivo.
  useEffect(() => {
    if (!window.matchMedia) return undefined;
    const preferencia = window.matchMedia(consultaReducida);
    const cambiar = () => setAutomatica(!preferencia.matches);
    preferencia.addEventListener('change', cambiar);
    return () => preferencia.removeEventListener('change', cambiar);
  }, []);

  // Fuera de la pantalla se detiene: nadie la está mirando.
  useEffect(() => {
    if (!raiz.current || !window.IntersectionObserver) return undefined;
    const observador = new IntersectionObserver(([entrada]) => setFuera(!entrada.isIntersecting), { threshold: 0.2 });
    observador.observe(raiz.current);
    return () => observador.disconnect();
  }, []);

  // La barra de progreso del objetivo activo es el reloj: al terminar su animación pasa al siguiente. Así, pausar
  // la barra (mouse encima, foco o el botón) también pausa la rotación, y al reanudar sigue desde donde iba.
  const avanza = automatica && !pausada && !enEspera && !fuera;
  const siguiente = () => setActual((indice) => (indice + 1) % OBJETIVOS.length);
  const elegido = OBJETIVOS[actual];

  return (
    <div ref={raiz} className="vitrina" data-automatica={automatica || undefined} data-avanza={avanza || undefined}
      onMouseEnter={() => setEnEspera(true)} onMouseLeave={() => setEnEspera(false)}
      onFocus={() => setEnEspera(true)} onBlur={(evento) => { if (!evento.currentTarget.contains(evento.relatedTarget)) setEnEspera(false); }}>
      <div className="vitrina__escenario" aria-live={avanza ? 'off' : 'polite'}>
        {OBJETIVOS.map(({ especialidad, imagen, encuadre }, indice) => (
          <img key={especialidad} className="vitrina__foto" src={imagen} alt="" width={760} height={900}
            loading="lazy" decoding="async" data-activa={indice === actual} style={{ objectPosition: encuadre }} />
        ))}
        <div className="vitrina__texto" key={elegido.especialidad}>
          <p className="vitrina__especialidad">{elegido.especialidad}</p>
          <h3>{elegido.objetivo}</h3>
          <p>{elegido.texto}</p>
          <Link to={`/profesionales?${new URLSearchParams({ especialidad: elegido.especialidad })}`} className="boton boton--principal">
            Ver profesionales de {elegido.especialidad} <Icono nombre="flecha" tamano={18} />
          </Link>
        </div>
        {automatica && (
          <button type="button" className="vitrina__pausa" onClick={() => setPausada((valor) => !valor)}
            aria-label={pausada ? 'Reanudar la rotación de objetivos' : 'Pausar la rotación de objetivos'}>
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
              {pausada ? <path d="M8 5.5v13l10.5-6.5Z" /> : <><rect x="6.5" y="5" width="3.5" height="14" rx="1" /><rect x="14" y="5" width="3.5" height="14" rx="1" /></>}
            </svg>
          </button>
        )}
      </div>

      <ul className="vitrina__lista" aria-label="Objetivos">
        {OBJETIVOS.map(({ especialidad, objetivo, imagen, encuadre }, indice) => (
          <li key={especialidad}>
            <button type="button" className="vitrina__opcion" aria-pressed={indice === actual} onClick={() => setActual(indice)}>
              <img src={imagen} alt="" width={56} height={56} loading="lazy" decoding="async" style={{ objectPosition: encuadre }} />
              <span><span className="vitrina__opcion-especialidad">{especialidad}</span><span className="vitrina__opcion-objetivo">{objetivo}</span></span>
              {indice === actual && automatica && <span className="vitrina__progreso" key={actual} onAnimationEnd={siguiente} aria-hidden="true" />}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

import { Link } from 'react-router-dom';
import fotoCentro from '../assets/inicio/centro-bienestar.webp';
import fotoNutricion from '../assets/inicio/nutricion.webp';
import logoHorizontal from '../assets/logo-fitsearch-horizontal.jpg';
import iconoLogo from '../assets/logo-fitsearch-icono.png';
import fotoProfesional from '../assets/perfil-profesional.webp';
import fotoUsuario from '../assets/perfil-usuario.webp';
import Icono from './Icono.jsx';
import './PantallaAcceso.css';

export function Logo({ className = '' }) {
  return <img src={logoHorizontal} alt="FitSearch — Plataforma inteligente de salud, deporte y bienestar" className={`logo ${className}`} />;
}

const ESPECIALIDADES = [
  { foto: fotoUsuario, nombre: 'Kinesiología', texto: 'Reserva sin llamadas' },
  { foto: fotoNutricion, nombre: 'Nutrición', texto: 'Calorías y macros del día' },
  { foto: fotoProfesional, nombre: 'Entrenamiento', texto: 'Profesionales verificados' },
];

// El panel de presentación cambia según a qué viene la persona: volver, crear su cuenta o recuperar el acceso.
const PRESENTACIONES = {
  ingreso: {
    etiqueta: 'Abre la puerta a tu bienestar',
    lema: <>Vuelve a tu <span>espacio</span> de bienestar.</>,
    descripcion: 'Tus profesionales, citas y el asistente de IA te esperan justo donde los dejaste.',
  },
  registro: {
    etiqueta: 'Tu bienestar comienza aquí',
    lema: <>Empieza tu <span>camino</span> de bienestar.</>,
    descripcion: 'Encuentra profesionales cerca de ti, reserva sin llamadas y conversa con el asistente de IA.',
  },
  recuperacion: {
    etiqueta: 'Recupera tu acceso',
    lema: <>Vuelve a <span>entrar</span> en pocos pasos.</>,
    descripcion: 'Te enviamos un enlace a tu correo para crear una contraseña nueva. Tus citas, favoritos y perfil siguen tal como los dejaste.',
  },
};

const PESTANAS = [
  { clave: 'ingreso', ruta: '/iniciar-sesion', texto: 'Ingresar' },
  { clave: 'registro', ruta: '/registro', texto: 'Crear cuenta' },
];

// Pantallas de acceso (inicio de sesión, registro y recuperación) con el estilo de la portada: la foto del centro de
// bienestar de fondo, la barra flotante translúcida y el formulario en una tarjeta. En el celular la foto queda arriba
// y la tarjeta sube como una hoja. Con `pestana` se muestran las pestañas para cambiar entre ingresar y crear cuenta;
// `tipo` elige el texto de la presentación (por omisión, el de la pestaña o el de ingreso).
export default function PantallaAcceso({ children, pestana, tipo = pestana ?? 'ingreso' }) {
  const presentacion = PRESENTACIONES[tipo];
  return (
    <div className="ingreso">
      <div className="ingreso__fondo" aria-hidden="true"><img src={fotoCentro} alt="" /></div>

      <header className="ingreso__barra">
        <Link to="/" className="ingreso__marca" aria-label="FitSearch, volver al inicio">
          <img src={iconoLogo} alt="" className="ingreso__marca-icono" /><span>Fit<span>Search</span></span>
        </Link>
        <Link to="/" className="ingreso__volver">
          <Icono nombre="flechaIzquierda" tamano={16} /><span>Volver a la portada</span>
        </Link>
      </header>

      <div className="ingreso__marco">
        <section className="ingreso__presentacion" aria-label="Qué es FitSearch">
          <p className="ingreso__etiqueta">{presentacion.etiqueta}</p>
          <p className="ingreso__lema">{presentacion.lema}</p>
          <p className="ingreso__descripcion">{presentacion.descripcion}</p>
          <ul className="ingreso__especialidades">
            {ESPECIALIDADES.map(({ foto, nombre, texto }) => (
              <li key={nombre}><img src={foto} alt="" /><span><strong>{nombre}</strong>{texto}</span></li>
            ))}
          </ul>
        </section>

        <section className="ingreso__tarjeta">
          {pestana && (
            <nav className="ingreso__pestanas" aria-label="Elige cómo entrar">
              {PESTANAS.map(({ clave, ruta, texto }) => (
                <Link key={clave} to={ruta} aria-current={clave === pestana ? 'page' : undefined}>{texto}</Link>
              ))}
            </nav>
          )}
          {children}
          <p className="ingreso__seguridad"><Icono nombre="escudo" tamano={14} /> Tus datos de salud están protegidos</p>
        </section>
      </div>
    </div>
  );
}

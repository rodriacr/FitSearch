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
  { foto: fotoNutricion, nombre: 'Nutrición', texto: 'Planes a tu ritmo' },
  { foto: fotoProfesional, nombre: 'Entrenamiento', texto: 'Profesionales verificados' },
];

const PESTANAS = [
  { clave: 'ingreso', ruta: '/iniciar-sesion', texto: 'Ingresar' },
  { clave: 'registro', ruta: '/registro', texto: 'Crear cuenta' },
];

// Pantallas de acceso (inicio de sesión, registro y recuperación) con el estilo de la portada: la foto del centro de
// bienestar de fondo, la barra flotante translúcida y el formulario en una tarjeta. En el celular la foto queda arriba
// y la tarjeta sube como una hoja. Con `pestana` se muestran las pestañas para cambiar entre ingresar y crear cuenta.
export default function PantallaAcceso({ children, pestana }) {
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
          <p className="ingreso__etiqueta">Abre la puerta a tu bienestar</p>
          <p className="ingreso__lema">Vuelve a tu <span>espacio</span> de bienestar.</p>
          <p className="ingreso__descripcion">Tus profesionales, citas y el asistente de IA te esperan justo donde los dejaste.</p>
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

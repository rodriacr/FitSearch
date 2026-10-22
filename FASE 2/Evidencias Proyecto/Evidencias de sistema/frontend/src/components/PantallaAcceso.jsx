import { Link } from 'react-router-dom';
import logoHorizontal from '../assets/logo-fitsearch-horizontal.jpg';
import iconoLogo from '../assets/logo-fitsearch-icono.png';
import fotoProfesional from '../assets/perfil-profesional.webp';
import fotoUsuario from '../assets/perfil-usuario.webp';
import Icono from './Icono.jsx';
import './PantallaAcceso.css';

export function Logo({ className = '' }) {
  return <img src={logoHorizontal} alt="FitSearch — Plataforma inteligente de salud, deporte y bienestar" className={`logo ${className}`} />;
}

// Pantallas de acceso (inicio de sesión, registro y recuperación): fondo azul petróleo con la presentación de
// FitSearch y una foto a la izquierda, y el formulario en una tarjeta blanca. En el celular la foto queda arriba
// y la tarjeta sube como una hoja.
export default function PantallaAcceso({ children }) {
  return (
    <div className="ingreso">
      <div className="ingreso__marco">
        <section className="ingreso__presentacion" aria-label="Qué es FitSearch">
          <Link to="/" className="ingreso__marca" aria-label="FitSearch, volver al inicio">
            <img src={iconoLogo} alt="" className="ingreso__marca-icono" /> FitSearch
          </Link>
          <p className="ingreso__etiqueta">Salud · Deporte · Nutrición</p>
          <p className="ingreso__lema">El profesional que buscas, <span>más cerca</span> de lo que crees</p>
          <p className="ingreso__descripcion">Busca en el mapa, compara reseñas y reserva tu hora.</p>
          <div className="ingreso__comunidad">
            <span className="ingreso__avatares" aria-hidden="true">
              <img src={fotoUsuario} alt="" />
              <img src={fotoProfesional} alt="" />
              <span><Icono nombre="check" tamano={14} /></span>
            </span>
            <span>Profesionales verificados<br />en Santiago</span>
          </div>
        </section>
        <figure className="ingreso__foto">
          <img src={fotoUsuario} alt="" />
          <figcaption className="ingreso__aviso-foto">
            <span className="ingreso__aviso-icono" aria-hidden="true"><Icono nombre="calendario" tamano={18} /></span>
            <span><strong>Reserva tu hora</strong>en pocos pasos y sin llamadas</span>
          </figcaption>
        </figure>
        <section className="ingreso__tarjeta">{children}</section>
      </div>
    </div>
  );
}

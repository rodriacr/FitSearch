import logoHorizontal from '../assets/logo-fitsearch-horizontal.jpg';
import iconoLogo from '../assets/logo-fitsearch-icono.png';
import { Link } from 'react-router-dom';

export function Logo({ className = '' }) {
  return <img src={logoHorizontal} alt="FitSearch — Plataforma inteligente de salud, deporte y bienestar" className={`logo ${className}`} />;
}

// Tarjeta centrada de las pantallas de acceso: logo, marca de agua y ola decorativa inferior.
export default function PantallaAcceso({ children }) {
  return (
    <div className="acceso">
      <section className="acceso__tarjeta">
        <Link to="/" aria-label="FitSearch, volver al inicio"><Logo className="acceso__logo" /></Link>
        <div className="acceso__contenido">{children}</div>
        <img src={iconoLogo} alt="" className="acceso__marca-agua" aria-hidden="true" />
        <svg className="acceso__ola" viewBox="0 0 400 90" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 30 C120 95 250 5 400 55 L400 90 L0 90 Z" className="ola--naranja" />
          <path d="M0 55 C140 105 260 30 400 75 L400 90 L0 90 Z" className="ola--azul" />
        </svg>
      </section>
    </div>
  );
}

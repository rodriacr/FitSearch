import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Icono from '../Icono.jsx';

// Encabezado de la portada que no tapa la página: arriba de todo es transparente sobre el hero; al bajar se esconde
// y, apenas la persona sube un poco, vuelve como una barra sólida. Con el foco adentro (teclado) nunca se esconde.
const ZONA_SUPERIOR = 80;
const UMBRAL = 6;

export default function EncabezadoPortada({ marca }) {
  const encabezado = useRef(null);
  const [estado, setEstado] = useState('arriba');

  useEffect(() => {
    let ultimo = window.scrollY;
    let cuadro = null;
    function actualizar() {
      cuadro = null;
      const posicion = window.scrollY;
      if (posicion < ZONA_SUPERIOR) {
        setEstado('arriba');
        ultimo = posicion;
        return;
      }
      const cambio = posicion - ultimo;
      if (Math.abs(cambio) < UMBRAL) return;
      ultimo = posicion;
      const conFoco = encabezado.current?.contains(document.activeElement);
      setEstado(cambio > 0 && !conFoco ? 'oculto' : 'solido');
    }
    function solicitar() {
      if (cuadro !== null) return;
      cuadro = window.requestAnimationFrame ? window.requestAnimationFrame(actualizar) : window.setTimeout(actualizar, 16);
    }
    window.addEventListener('scroll', solicitar, { passive: true });
    actualizar();
    return () => {
      window.removeEventListener('scroll', solicitar);
      if (cuadro !== null) (window.cancelAnimationFrame ?? window.clearTimeout)(cuadro);
    };
  }, []);

  return (
    <header ref={encabezado} className="portada__encabezado" data-estado={estado}
      onFocus={() => setEstado((actual) => (actual === 'oculto' ? 'solido' : actual))}>
      <div className="portada__ancho portada__barra">
        <Link to="/" className="portada__marca" aria-label="FitSearch, portada">{marca}</Link>
        <nav className="portada__navegacion" aria-label="Navegación principal">
          <a href="#especialidades">Especialidades</a><a href="#que-ofrecemos">Qué ofrecemos</a>
          <a href="#como-funciona">Cómo funciona</a><a href="#para-profesionales">Para profesionales</a>
        </nav>
        <div className="portada__accesos">
          <Link to="/iniciar-sesion" className="portada__enlace-acceso">Iniciar sesión</Link>
          <Link to="/registro" className="boton boton--principal boton--compacto">Crear cuenta <Icono nombre="flecha" tamano={18} /></Link>
        </div>
      </div>
    </header>
  );
}

import { useEffect, useState } from 'react';
import Icono from '../Icono.jsx';
import './BotonSubir.css';

// Botón para volver arriba en la portada, que es larga: aparece cuando la persona ya dejó atrás el hero. El anillo
// muestra cuánto se ha recorrido (donde el navegador anima según el scroll; si no, queda como un borde fijo).
export default function BotonSubir() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let cuadro = null;
    function actualizar() {
      cuadro = null;
      const hero = document.querySelector('.hero-bienestar');
      const finHero = hero ? hero.getBoundingClientRect().bottom + window.scrollY : 0;
      setVisible(window.scrollY > Math.max(window.innerHeight * 1.5, finHero));
    }
    function solicitar() {
      if (cuadro !== null) return;
      cuadro = window.requestAnimationFrame ? window.requestAnimationFrame(actualizar) : window.setTimeout(actualizar, 16);
    }
    window.addEventListener('scroll', solicitar, { passive: true });
    window.addEventListener('resize', solicitar);
    actualizar();
    return () => {
      window.removeEventListener('scroll', solicitar);
      window.removeEventListener('resize', solicitar);
      if (cuadro !== null) (window.cancelAnimationFrame ?? window.clearTimeout)(cuadro);
    };
  }, []);

  function subir() {
    const reducido = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reducido ? 'auto' : 'smooth' });
    // El foco vuelve al comienzo del contenido, para seguir con el teclado desde arriba.
    document.getElementById('contenido')?.focus({ preventScroll: true });
  }

  return (
    <button type="button" className="boton-subir" data-visible={visible || undefined} onClick={subir}
      aria-label="Volver al inicio de la página" aria-hidden={!visible || undefined} tabIndex={visible ? undefined : -1}>
      <svg className="boton-subir__anillo" viewBox="0 0 48 48" aria-hidden="true">
        <circle cx="24" cy="24" r="22" pathLength="100" />
      </svg>
      <Icono nombre="flecha" tamano={20} />
    </button>
  );
}

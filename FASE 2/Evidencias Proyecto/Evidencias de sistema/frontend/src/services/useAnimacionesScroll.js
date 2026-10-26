import { useEffect, useRef } from 'react';

// El contenido permanece visible si el navegador no soporta las animaciones.
// No altera el scroll ni bloquea la navegación por teclado.
export default function useAnimacionesScroll() {
  const contenedor = useRef(null);

  useEffect(() => {
    const raiz = contenedor.current;
    if (!raiz || !window.matchMedia) return;
    const preferencia = window.matchMedia('(prefers-reduced-motion: reduce)');
    const animaciones = new Map();
    const revelados = new WeakSet();
    const fotografias = [...raiz.querySelectorAll('[data-paralaje]')];
    let observador;
    let cuadro = null;

    function actualizarFotografias() {
      cuadro = null;
      for (const foto of fotografias) {
        const limites = foto.parentElement.getBoundingClientRect();
        if (limites.bottom < 0 || limites.top > window.innerHeight) continue;
        const desplazamiento = Math.max(-18, Math.min(18, -limites.top * 0.045));
        foto.style.setProperty('--desplazamiento-hero', `${desplazamiento}px`);
      }
    }

    function solicitarCuadro() {
      if (cuadro === null) cuadro = window.requestAnimationFrame(actualizarFotografias);
    }

    function terminarAnimacion(elemento) {
      animaciones.get(elemento)?.cancel();
      animaciones.delete(elemento);
    }

    function mostrarAlEnfocar(evento) {
      for (const elemento of animaciones.keys()) {
        if (elemento.contains(evento.target)) terminarAnimacion(elemento);
      }
    }

    function detener() {
      observador?.disconnect();
      window.removeEventListener('scroll', solicitarCuadro);
      window.removeEventListener('resize', solicitarCuadro);
      if (cuadro !== null) window.cancelAnimationFrame(cuadro);
      cuadro = null;
      for (const elemento of animaciones.keys()) terminarAnimacion(elemento);
      for (const foto of fotografias) foto.style.removeProperty('--desplazamiento-hero');
    }

    function configurar() {
      detener();
      if (preferencia.matches) return;
      if (window.IntersectionObserver) {
        observador = new IntersectionObserver((entradas) => {
          for (const { target: elemento, isIntersecting } of entradas) {
            if (!isIntersecting || revelados.has(elemento)) continue;
            revelados.add(elemento);
            observador.unobserve(elemento);
            if (!elemento.animate || elemento.contains(document.activeElement)) continue;
            const animacion = elemento.animate([
              { opacity: 0, translate: '0 26px' },
              { opacity: 1, translate: '0 0' },
            ], {
              duration: 700,
              delay: Number(elemento.dataset.revelarRetardo) || 0,
              easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
              fill: 'backwards',
            });
            animaciones.set(elemento, animacion);
            animacion.onfinish = () => animaciones.delete(elemento);
          }
        }, { threshold: 0.08 });
        for (const elemento of raiz.querySelectorAll('[data-revelar]')) observador.observe(elemento);
      }
      window.addEventListener('scroll', solicitarCuadro, { passive: true });
      window.addEventListener('resize', solicitarCuadro);
      solicitarCuadro();
    }

    raiz.addEventListener('focusin', mostrarAlEnfocar);
    preferencia.addEventListener('change', configurar);
    configurar();
    return () => {
      detener();
      raiz.removeEventListener('focusin', mostrarAlEnfocar);
      preferencia.removeEventListener('change', configurar);
    };
  }, []);

  return contenedor;
}

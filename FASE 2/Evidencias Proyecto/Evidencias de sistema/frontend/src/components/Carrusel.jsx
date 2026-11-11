import { useCallback, useEffect, useRef, useState } from 'react';
import Icono from './Icono.jsx';
import './Carrusel.css';

const suave = () => (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth');

// Fila que se desliza con el dedo, el trackpad o la rueda del mouse y con las flechas de los costados (11-11-2026).
// Cada flecha aparece solo si hay más contenido hacia ese lado; si todo cabe (por ejemplo, en escritorio, donde la fila
// vuelve a ser una grilla), no se muestra ninguna. Con el teclado se recorren los elementos y cada uno entra en vista
// solo: por eso las flechas no están en el orden de tabulación (siguen disponibles para lectores de pantalla). Al tocar
// un elemento que se ve a medias, la fila se corre hasta mostrarlo entero.
// "nombre" va en plural y en minúsculas: «especialidades» → «Ver más especialidades». "tamano" compacto achica las
// flechas para una barra baja (por ejemplo, unas pestañas). El resto de las propiedades va a la fila (role, aria-label).
export default function Carrusel({ como: Lista = 'div', className = '', nombre, tamano, children, ...resto }) {
  const lista = useRef(null);
  const [bordes, setBordes] = useState({ atras: false, adelante: false });

  const medir = useCallback(() => {
    const fila = lista.current;
    if (!fila) return;
    const atras = fila.scrollLeft > 4;
    const adelante = fila.scrollLeft + fila.clientWidth < fila.scrollWidth - 4;
    setBordes((actual) => (actual.atras === atras && actual.adelante === adelante ? actual : { atras, adelante }));
  }, []);

  useEffect(() => {
    const fila = lista.current;
    if (!fila) return undefined;
    let cuadro = null;
    const alDesplazar = () => {
      if (cuadro === null) cuadro = requestAnimationFrame(() => { cuadro = null; medir(); });
    };
    fila.addEventListener('scroll', alDesplazar, { passive: true });
    // Mide al montarse y cada vez que cambia el tamaño (al girar el celular o al llegar las tarjetas de la API).
    const observador = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(alDesplazar);
    observador?.observe(fila);
    return () => {
      fila.removeEventListener('scroll', alDesplazar);
      observador?.disconnect();
      if (cuadro !== null) cancelAnimationFrame(cuadro);
    };
  }, [medir]);

  function desplazar(cuanto) {
    const fila = lista.current;
    if (fila.scrollBy) fila.scrollBy({ left: cuanto, behavior: suave() });
    else fila.scrollLeft += cuanto;
  }

  // Avanza casi una pantalla; en los carruseles con encaje, la siguiente tarjeta queda alineada con el título.
  const mover = (direccion) => desplazar(Math.max(lista.current.clientWidth * 0.8, 120) * direccion);

  function mostrarEntero(evento) {
    const fila = lista.current;
    let elemento = evento.target;
    while (elemento && elemento.parentElement !== fila) elemento = elemento.parentElement;
    if (!elemento) return;
    const caja = fila.getBoundingClientRect();
    const propio = elemento.getBoundingClientRect();
    if (propio.left < caja.left) desplazar(propio.left - caja.left - 8);
    else if (propio.right > caja.right) desplazar(propio.right - caja.right + 8);
  }

  return (
    <div className={`carrusel${tamano === 'compacto' ? ' carrusel--compacto' : ''}`}>
      <Lista ref={lista} className={`${className} carrusel-movil`.trim()} onClick={mostrarEntero} {...resto}>{children}</Lista>
      <button type="button" className="carrusel__boton carrusel__boton--atras" tabIndex={-1} aria-label={`Ver ${nombre} anteriores`}
        disabled={!bordes.atras} onClick={() => mover(-1)}>
        <Icono nombre="chevronIzquierda" tamano={tamano === 'compacto' ? 18 : 22} />
      </button>
      <button type="button" className="carrusel__boton carrusel__boton--adelante" tabIndex={-1} aria-label={`Ver más ${nombre}`}
        disabled={!bordes.adelante} onClick={() => mover(1)}>
        <Icono nombre="chevronDerecha" tamano={tamano === 'compacto' ? 18 : 22} />
      </button>
    </div>
  );
}

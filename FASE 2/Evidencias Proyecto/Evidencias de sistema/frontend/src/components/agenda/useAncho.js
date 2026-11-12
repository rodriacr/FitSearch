import { useEffect, useState } from 'react';

// Ancho de un elemento (con ResizeObserver). La agenda decide con él si muestra la semana completa o un día a la vez:
// depende del espacio que le deja el menú lateral, no solo del ancho de la ventana.
export default function useAncho(referencia) {
  const [ancho, setAncho] = useState(() => (typeof window === 'undefined' ? 1024 : window.innerWidth));
  useEffect(() => {
    const elemento = referencia.current;
    // ResizeObserver avisa el ancho apenas empieza a observar; sin él se usa el ancho de la ventana.
    if (!elemento || typeof ResizeObserver === 'undefined') return undefined;
    const observador = new ResizeObserver(([entrada]) => setAncho(entrada.contentRect.width));
    observador.observe(elemento);
    return () => observador.disconnect();
  }, [referencia]);
  return ancho;
}

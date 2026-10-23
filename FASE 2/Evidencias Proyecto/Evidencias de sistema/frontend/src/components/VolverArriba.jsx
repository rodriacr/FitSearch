import { useLayoutEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

// Al entrar a otra pantalla la vista parte desde arriba (antes conservaba el scroll de la anterior).
// Con "atrás" o "adelante" (POP) el navegador recupera la posición, y los cambios de filtros o de página
// del buscador (misma ruta, solo cambia ?…) tampoco mueven la vista.
export default function VolverArriba() {
  const { pathname } = useLocation();
  const tipo = useNavigationType();
  const rutaAnterior = useRef(pathname);

  // Antes de pintar, para que no se alcance a ver la pantalla nueva a media altura.
  useLayoutEffect(() => {
    if (rutaAnterior.current === pathname) return;
    rutaAnterior.current = pathname;
    if (tipo !== 'POP') window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname, tipo]);

  return null;
}

import { useEffect } from 'react';

// Hook (React exige el prefijo "use"): mientras un panel cubre la pantalla del celular (menú lateral, filtros),
// la página de fondo no se desplaza al arrastrar sobre el panel. Al cerrarlo se devuelve el valor que había.
export default function useBloquearScroll(activo) {
  useEffect(() => {
    if (!activo) return undefined;
    const anterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = anterior;
    };
  }, [activo]);
}

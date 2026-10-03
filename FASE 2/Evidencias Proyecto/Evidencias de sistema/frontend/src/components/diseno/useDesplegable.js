import { useEffect, useRef, useState } from 'react';

// Hook (React exige el prefijo "use") de un panel desplegable (menú de la cuenta, notificaciones): se cierra con Escape o al hacer clic fuera.
export default function useDesplegable() {
  const [abierto, setAbierto] = useState(false);
  const contenedor = useRef(null);
  const boton = useRef(null);

  useEffect(() => {
    if (!abierto) return undefined;
    const alPresionar = (evento) => {
      if (!contenedor.current?.contains(evento.target)) setAbierto(false);
    };
    const alTeclear = (evento) => {
      if (evento.key !== 'Escape') return;
      setAbierto(false);
      boton.current?.focus();
    };
    document.addEventListener('mousedown', alPresionar);
    document.addEventListener('keydown', alTeclear);
    return () => {
      document.removeEventListener('mousedown', alPresionar);
      document.removeEventListener('keydown', alTeclear);
    };
  }, [abierto]);

  return { abierto, setAbierto, contenedor, boton };
}

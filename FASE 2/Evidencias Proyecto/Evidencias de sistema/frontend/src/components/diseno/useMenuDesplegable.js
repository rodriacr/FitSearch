import { useCallback, useEffect, useRef, useState } from 'react';

// Menú lateral de escritorio (18-11-2026, pedido del PO): siempre contraído a solo íconos y se despliega cuando el mouse
// se acerca a los íconos o cuando se recorre con el teclado. Lo usan el usuario, el profesional y el administrador.
// La espera al entrar evita que se abra si el mouse solo cruza la columna camino a otra parte; la de salida perdona
// salirse un instante del borde. Con el teclado se abre de inmediato y se cierra al sacar el foco del menú.
const ESPERA_ABRIR = 120;
const ESPERA_CERRAR = 200;

// Solo el foco del teclado despliega el menú: al hacer clic en una opción el foco queda en ella, pero el menú debe
// cerrarse igual cuando el mouse se va.
function focoDeTeclado(elemento) {
  try {
    return elemento.matches(':focus-visible');
  } catch {
    return true;
  }
}

export default function useMenuDesplegable() {
  const [conMouse, setConMouse] = useState(false);
  const [conTeclado, setConTeclado] = useState(false);
  const espera = useRef(null);
  useEffect(() => () => clearTimeout(espera.current), []);

  const programar = useCallback((valor, milisegundos) => {
    clearTimeout(espera.current);
    espera.current = setTimeout(() => setConMouse(valor), milisegundos);
  }, []);

  const propiedades = {
    onMouseEnter: () => programar(true, ESPERA_ABRIR),
    onMouseLeave: () => programar(false, ESPERA_CERRAR),
    onFocus: (evento) => { if (focoDeTeclado(evento.target)) setConTeclado(true); },
    onBlur: (evento) => { if (!evento.currentTarget.contains(evento.relatedTarget)) setConTeclado(false); },
  };
  return { desplegado: conMouse || conTeclado, propiedades };
}

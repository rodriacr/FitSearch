import { useEffect, useRef } from 'react';

export default function useVolverFoco(abierta) {
  const disparador = useRef(null);
  useEffect(() => {
    if (abierta || !disparador.current) return;
    if (disparador.current.isConnected) disparador.current.focus();
    disparador.current = null;
  }, [abierta]);
  return {
    recordar: (boton) => {
      disparador.current = boton;
    },
    olvidar: () => {
      disparador.current = null;
    },
  };
}

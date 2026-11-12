import { useCallback, useEffect, useState } from 'react';

// Menú lateral compacto (solo íconos) en pantallas grandes, a elección de cada persona (11-11-2026). Lo usan el usuario,
// el profesional y el administrador. La preferencia queda en este navegador; si no guarda datos, dura la visita.
const CLAVE = 'fitsearch_menu_compacto';

function leer() {
  try {
    return localStorage.getItem(CLAVE) === '1';
  } catch {
    return false;
  }
}

export default function useMenuCompacto() {
  const [compacto, setCompacto] = useState(leer);
  useEffect(() => {
    try {
      localStorage.setItem(CLAVE, compacto ? '1' : '0');
    } catch {
      // Sin almacenamiento (modo privado o datos bloqueados): la elección dura solo esta visita.
    }
  }, [compacto]);
  const alternar = useCallback(() => setCompacto((actual) => !actual), []);
  return [compacto, alternar];
}

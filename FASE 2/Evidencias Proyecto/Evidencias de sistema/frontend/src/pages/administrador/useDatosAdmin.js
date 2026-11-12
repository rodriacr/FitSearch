import { useEffect, useState } from 'react';
import { solicitar } from '../../services/api.js';

// Carga una ruta de la API del administrador; mientras llega otra ruta se conservan los datos anteriores para no saltar
// a «Cargando…» al cambiar un filtro (11-11-2026).
export function useDatosAdmin(ruta) {
  const [intento, setIntento] = useState(0);
  const [estado, setEstado] = useState({ clave: null, datos: null, error: '' });
  const clave = `${ruta}#${intento}`;
  useEffect(() => {
    let vigente = true;
    solicitar(ruta)
      .then((datos) => vigente && setEstado({ clave, datos, error: '' }))
      .catch((error) => vigente && setEstado((anterior) => ({ clave, datos: anterior.datos, error: error.message })));
    return () => { vigente = false; };
  }, [clave, ruta]);
  return {
    datos: estado.datos,
    error: estado.clave === clave ? estado.error : '',
    actualizando: estado.clave !== clave && Boolean(estado.datos),
    reintentar: () => setIntento((valor) => valor + 1),
  };
}

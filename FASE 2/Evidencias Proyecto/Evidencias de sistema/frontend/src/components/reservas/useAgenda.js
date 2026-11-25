import { useEffect, useState } from 'react';
import { solicitar } from '../../services/api.js';

// Hook (React exige el prefijo "use") que lee una ruta de la agenda y la vuelve a pedir cuando cambia "revision".
export default function useAgenda(ruta, revision) {
  const [estado, setEstado] = useState({ datos: null, error: '', revision: -1, ruta: null });
  useEffect(() => {
    let vigente = true;
    solicitar(ruta)
      .then((d) => {
        if (vigente) {
          setEstado({ datos: d, error: '', revision, ruta });
        }
      })
      .catch((e) => {
        if (vigente) setEstado((anterior) => ({ ...anterior, error: e.message, revision, ruta }));
      });
    return () => {
      vigente = false;
    };
  }, [ruta, revision]);
  const cargando = estado.revision !== revision || estado.ruta !== ruta;
  return { datos: estado.datos, error: cargando ? '' : estado.error, cargando };
}

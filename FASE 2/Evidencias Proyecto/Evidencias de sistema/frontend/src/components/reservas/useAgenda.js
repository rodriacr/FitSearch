import { useEffect, useState } from 'react';
import { solicitar } from '../../services/api.js';

// Hook (React exige el prefijo "use") que lee una ruta de la agenda y la vuelve a pedir cuando cambia "revision".
export default function useAgenda(ruta, revision) {
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let vigente = true;
    solicitar(ruta)
      .then((d) => {
        if (vigente) {
          setDatos(d);
          setError('');
        }
      })
      .catch((e) => {
        if (vigente) setError(e.message);
      });
    return () => {
      vigente = false;
    };
  }, [ruta, revision]);
  return { datos, error };
}

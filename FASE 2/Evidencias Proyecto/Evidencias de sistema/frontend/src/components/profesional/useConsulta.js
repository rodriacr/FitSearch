import { useEffect, useState } from 'react';

// Hook que pide datos a la API y permite reintentar. "clave" identifica la consulta (por ejemplo, el cliente o las
// semanas elegidas): mientras la respuesta guardada sea de otra clave, la consulta está cargando.
export default function useConsulta(consultar, clave = '') {
  const [intento, setIntento] = useState(0);
  const [estado, setEstado] = useState(null);
  const actual = `${clave}-${intento}`;

  useEffect(() => {
    let activo = true;
    consultar()
      .then((datos) => activo && setEstado({ clave: actual, datos }))
      .catch((error) => activo && setEstado({ clave: actual, error }));
    return () => { activo = false; };
  }, [consultar, actual]);

  const cargando = estado?.clave !== actual;
  return {
    cargando,
    // Al cambiar de clave se conservan los datos anteriores hasta que lleguen los nuevos (sin parpadeo).
    datos: estado?.datos,
    error: cargando ? null : estado?.error,
    reintentar: () => setIntento((n) => n + 1),
  };
}

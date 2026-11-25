import { solicitar } from './api.js';

export function crearAlmacen(ruta) {
  let estado = { total: 0, cargando: true, error: null };
  let pendiente;
  let generacion = 0;
  let reloj;
  let invalidado = false;
  const oyentes = new Set();
  const publicar = (siguiente) => { estado = siguiente; oyentes.forEach((fn) => fn()); };
  const actualizar = () => {
    if (pendiente || !oyentes.size) return pendiente;
    const turno = generacion;
    pendiente = solicitar(ruta).then((datos) => {
      if (turno === generacion) publicar({ total: datos.total ?? datos.verificacionesPendientes ?? 0, cargando: false, error: null });
    }).catch((error) => {
      if (turno === generacion) publicar({ ...estado, cargando: false, error });
    }).finally(() => {
      if (turno === generacion) {
        pendiente = undefined;
        if (invalidado) { invalidado = false; actualizar(); }
      }
    });
    return pendiente;
  };
  const alVolver = () => { if (document.visibilityState !== 'hidden') actualizar(); };
  // Una lectura puede terminar mientras sigue en vuelo el contador anterior: se vuelve a consultar después.
  const invalidar = () => { if (pendiente) invalidado = true; else actualizar(); };
  return {
    leer: () => estado,
    actualizar,
    suscribir(fn) {
      oyentes.add(fn);
      if (oyentes.size === 1) {
        actualizar();
        reloj = setInterval(alVolver, 60000);
        document.addEventListener('visibilitychange', alVolver);
        window.addEventListener('fitsearch:mensajes-actualizados', invalidar);
      }
      return () => {
        oyentes.delete(fn);
        if (!oyentes.size) {
          clearInterval(reloj);
          document.removeEventListener('visibilitychange', alVolver);
          window.removeEventListener('fitsearch:mensajes-actualizados', invalidar);
          generacion++;
          pendiente = undefined;
          invalidado = false;
          estado = { total: 0, cargando: true, error: null };
        }
      };
    },
  };
}

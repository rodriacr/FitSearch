import { solicitar } from './api.js';

// Directorio de centros de salud y gimnasios (FS-HU-25). La ubicación (si la hay) solo viaja a la API para calcular
// distancias y ordenar por cercanía; no se agrega a la URL de la página.
export function buscarEstablecimientos(categoria, filtros = {}, ubicacion = null) {
  const parametros = new URLSearchParams({ categoria });
  if (filtros.comuna) parametros.set('comuna', filtros.comuna);
  if (filtros.pagina) parametros.set('pagina', filtros.pagina);
  if (ubicacion) {
    parametros.set('lat', ubicacion.lat);
    parametros.set('lng', ubicacion.lng);
    parametros.set('orden', 'cercania');
    if (filtros.distancia) parametros.set('distanciaKm', filtros.distancia);
  }
  return solicitar(`/establecimientos?${parametros}`);
}

export const obtenerComunasEstablecimientos = (categoria) => solicitar(`/establecimientos/filtros?categoria=${categoria}`);
export const obtenerEstablecimiento = (id) => solicitar(`/establecimientos/${id}`);

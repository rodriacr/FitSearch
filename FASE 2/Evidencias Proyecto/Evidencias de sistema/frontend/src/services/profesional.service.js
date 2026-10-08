import { solicitar } from './api.js';

// Filtros de la URL de /profesionales y el nombre del parámetro que espera la API.
const PARAMETROS_API = {
  q: 'q', especialidad: 'especialidad', comuna: 'comuna', modalidad: 'modalidad', calificacion: 'calificacionMin',
  distancia: 'distanciaKm', orden: 'orden', pagina: 'pagina', limite: 'limite',
};

// La ubicación (si la hay) solo viaja a la API para calcular distancias; no se agrega a la URL de la página.
export function buscarProfesionales(filtros = {}, ubicacion = null) {
  const parametros = new URLSearchParams();
  for (const [clave, nombreApi] of Object.entries(PARAMETROS_API)) {
    if (filtros[clave]) parametros.set(nombreApi, filtros[clave]);
  }
  if (ubicacion) {
    parametros.set('lat', ubicacion.lat);
    parametros.set('lng', ubicacion.lng);
  }
  const consulta = parametros.toString();
  return solicitar(`/profesionales${consulta ? `?${consulta}` : ''}`);
}

export const obtenerFiltros = () => solicitar('/profesionales/filtros');
export const obtenerProfesional = (id) => solicitar(`/profesionales/${id}`);
export const listarResenas = (id, pagina = 1) => solicitar(`/profesionales/${id}/resenas?pagina=${pagina}`);
export const guardarResena = (id, datos) => solicitar(`/profesionales/${id}/resenas`, { metodo: 'PUT', cuerpo: datos });
export const eliminarResena = (id) => solicitar(`/profesionales/${id}/resenas`, { metodo: 'DELETE' });
// Ficha propia del profesional (FS-HU-04).
export const obtenerMiFicha = () => solicitar('/profesionales/mi-ficha');
export const guardarMiFicha = (ficha) => solicitar('/profesionales/mi-ficha', { metodo: 'PUT', cuerpo: ficha });

import { solicitar } from './api.js';

export function listarProfesionales({ especialidad = '', comuna = '', pagina = '1' } = {}) {
  const parametros = new URLSearchParams({ pagina });
  if (comuna) parametros.set('comuna', comuna);
  if (especialidad) parametros.set('especialidad', especialidad);
  return solicitar(`/profesionales?${parametros}`);
}
export const obtenerEspecialidades = () => solicitar('/profesionales/especialidades');

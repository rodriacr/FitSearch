import { solicitar } from './api.js';

export function listarProfesionales({ especialidad = '', comuna = '', pagina = '1' } = {}) {
  const parametros = new URLSearchParams({ pagina });
  if (comuna) parametros.set('comuna', comuna);
  if (especialidad) parametros.set('especialidad', especialidad);
  return solicitar(`/profesionales?${parametros}`);
}
export const obtenerEspecialidades = () => solicitar('/profesionales/especialidades');

// Ficha pública del propio profesional (solo cuentas con rol "profesional").
export const obtenerMiFicha = () => solicitar('/profesionales/mi-ficha');
export const guardarMiFicha = (ficha) => solicitar('/profesionales/mi-ficha', { metodo: 'PUT', cuerpo: ficha });

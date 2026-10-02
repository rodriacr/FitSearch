import { solicitar } from './api.js';

export function obtenerPerfil() {
  return solicitar('/perfil');
}

export function actualizarPerfil(datos) {
  return solicitar('/perfil', { metodo: 'PUT', cuerpo: datos });
}

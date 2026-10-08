import { solicitar } from './api.js';

export function obtenerPerfil() {
  return solicitar('/perfil');
}

// "Elegir perfil" (DAS, D25): devuelve el perfil y un token nuevo con el rol confirmado. Se elige una sola vez.
export function actualizarTipoCuenta({ rol }) {
  return solicitar('/perfil/tipo-cuenta', { metodo: 'PUT', cuerpo: { rol } });
}

export function actualizarPerfil(datos) {
  return solicitar('/perfil', { metodo: 'PUT', cuerpo: datos });
}

export function actualizarObjetivos(datos) {
  return solicitar('/perfil/objetivos', { metodo: 'PUT', cuerpo: datos });
}

export function actualizarSalud(datos) {
  return solicitar('/perfil/salud', { metodo: 'PUT', cuerpo: datos });
}

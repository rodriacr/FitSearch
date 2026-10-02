import { solicitar } from './api.js';

export function registrar({ nombre, correo, password }) {
  return solicitar('/auth/registro', { metodo: 'POST', cuerpo: { nombre, correo, password }, conSesion: false });
}

export function iniciarSesion({ correo, password }) {
  return solicitar('/auth/login', { metodo: 'POST', cuerpo: { correo, password }, conSesion: false });
}

export function cerrarSesion() {
  return solicitar('/auth/logout', { metodo: 'POST' });
}

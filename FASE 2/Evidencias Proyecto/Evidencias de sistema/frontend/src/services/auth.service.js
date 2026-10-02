import { solicitar } from './api.js';

export function registrar({ nombre, correo, password }) {
  return solicitar('/auth/registro', { metodo: 'POST', cuerpo: { nombre, correo, password }, conSesion: false });
}

export function iniciarSesion({ correo, password, recordar = false }) {
  return solicitar('/auth/login', { metodo: 'POST', cuerpo: { correo, password, recordar }, conSesion: false });
}

// "Continuar con Google" (FS-HU-16): se envía el token de identidad que entrega Google en el navegador.
export function iniciarSesionConGoogle({ credencial, recordar = false }) {
  return solicitar('/auth/google', { metodo: 'POST', cuerpo: { credencial, recordar }, conSesion: false });
}

export function cerrarSesion() {
  return solicitar('/auth/logout', { metodo: 'POST' });
}

export function solicitarRecuperacion({ correo }) {
  return solicitar('/auth/recuperar', { metodo: 'POST', cuerpo: { correo }, conSesion: false });
}

export function restablecerPassword({ token, password }) {
  return solicitar('/auth/restablecer', { metodo: 'POST', cuerpo: { token, password }, conSesion: false });
}

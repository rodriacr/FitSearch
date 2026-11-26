import { solicitar, solicitarEnVivo } from './api.js';

// Asistente IA del usuario (FS-HU-07, DAS D33).
export const obtenerEstadoAsistente = () => solicitar('/asistente/estado');
export const listarConversaciones = () => solicitar('/asistente/conversaciones');
export const abrirConversacion = (id) => solicitar(`/asistente/conversaciones/${id}`);

// SC-47: con alTexto, la respuesta llega en vivo (el texto aparece mientras se escribe). Sin soporte de lectura por partes
// en el navegador, se pide la respuesta completa como antes.
const enviarPregunta = (ruta, cuerpo, alTexto) => (alTexto && typeof ReadableStream !== 'undefined'
  ? solicitarEnVivo(ruta, { cuerpo }, (evento, datos) => { if (evento === 'texto') alTexto(datos.texto); })
  : solicitar(ruta, { metodo: 'POST', cuerpo }));
export const iniciarConversacion = (mensaje, { alTexto } = {}) => enviarPregunta('/asistente/conversaciones', { mensaje }, alTexto);
export const enviarMensaje = (id, mensaje, { alTexto } = {}) => enviarPregunta(`/asistente/conversaciones/${id}/mensajes`, { mensaje }, alTexto);

export const fijarConversacion = (id, fijada) => solicitar(`/asistente/conversaciones/${id}`, { metodo: 'PATCH', cuerpo: { fijada } });
export const eliminarConversacion = (id) => solicitar(`/asistente/conversaciones/${id}`, { metodo: 'DELETE' });

// SC-47: valoración de una respuesta y modalidad u orden elegidos en la tarjeta de la recomendación.
export const actualizarMensaje = (id, cambios) => solicitar(`/asistente/mensajes/${id}`, { metodo: 'PATCH', cuerpo: cambios });
// SC-47: permiso para que el asistente use el perfil ('no', 'perfil' o 'perfil_salud').
export const guardarPermisoPerfil = (permiso) => solicitar('/asistente/permiso-perfil', { metodo: 'PUT', cuerpo: { permiso } });

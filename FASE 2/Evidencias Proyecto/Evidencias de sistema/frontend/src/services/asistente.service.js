import { solicitar } from './api.js';

// Asistente IA del usuario (FS-HU-07, DAS D33).
export const obtenerEstadoAsistente = () => solicitar('/asistente/estado');
export const listarConversaciones = () => solicitar('/asistente/conversaciones');
export const abrirConversacion = (id) => solicitar(`/asistente/conversaciones/${id}`);
export const iniciarConversacion = (mensaje) => solicitar('/asistente/conversaciones', { metodo: 'POST', cuerpo: { mensaje } });
export const enviarMensaje = (id, mensaje) => solicitar(`/asistente/conversaciones/${id}/mensajes`, { metodo: 'POST', cuerpo: { mensaje } });
export const fijarConversacion = (id, fijada) => solicitar(`/asistente/conversaciones/${id}`, { metodo: 'PATCH', cuerpo: { fijada } });
export const eliminarConversacion = (id) => solicitar(`/asistente/conversaciones/${id}`, { metodo: 'DELETE' });

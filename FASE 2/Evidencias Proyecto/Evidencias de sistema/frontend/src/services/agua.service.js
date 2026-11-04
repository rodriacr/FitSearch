import { solicitar } from './api.js';

// Registro de agua (FS-HU-33). La API trabaja siempre con el día de hoy en Chile.
export const obtenerAguaHoy = () => solicitar('/agua');
export const sumarAgua = (ml) => solicitar('/agua', { metodo: 'POST', cuerpo: { ml } });
export const deshacerAgua = (id) => solicitar(`/agua/${id}`, { metodo: 'DELETE' });

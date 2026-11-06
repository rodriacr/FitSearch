import { solicitar } from './api.js';

// Registro de agua (FS-HU-33). Sin fecha, la API usa el día de hoy en Chile; Comidas envía el día que se está viendo.
export const obtenerAguaHoy = () => solicitar('/agua');
export const obtenerAguaDelDia = (fecha) => solicitar(fecha ? `/agua?fecha=${fecha}` : '/agua');
export const sumarAgua = (ml, fecha) => solicitar('/agua', { metodo: 'POST', cuerpo: fecha ? { ml, fecha } : { ml } });
export const deshacerAgua = (id) => solicitar(`/agua/${id}`, { metodo: 'DELETE' });

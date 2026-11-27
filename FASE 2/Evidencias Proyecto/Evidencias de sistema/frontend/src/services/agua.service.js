import { solicitar } from './api.js';

// Registro de agua (FS-HU-33). Sin fecha, la API usa el día de hoy en Chile; Comidas envía el día que se está viendo.
export const obtenerAguaHoy = () => solicitar('/agua');
// Agua de cada día de la semana actual, para el resumen semanal del Inicio (25-11-2026).
export const obtenerAguaSemana = () => solicitar('/agua/semana');
export const obtenerAguaDelDia = (fecha) => solicitar(fecha ? `/agua?fecha=${fecha}` : '/agua');
export const sumarAgua = (ml, fecha) => solicitar('/agua', { metodo: 'POST', cuerpo: fecha ? { ml, fecha } : { ml } });
export const deshacerAgua = (id, fecha) => solicitar(`/agua/${id}${fecha ? `?fecha=${fecha}` : ''}`, { metodo: 'DELETE' });
// Día de hoy en Chile ('AAAA-MM-DD'), el mismo corte que usa la API.
export const hoyEnChile = (ahora = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(ahora);

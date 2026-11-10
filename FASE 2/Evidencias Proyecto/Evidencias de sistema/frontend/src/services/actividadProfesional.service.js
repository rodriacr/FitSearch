// Clientes (FS-HU-27) y reportes (FS-HU-28) del profesional.
import { solicitar } from './api.js';

export const obtenerClientes = () => solicitar('/profesional/clientes');
export const obtenerHistorialCliente = (id) => solicitar(`/profesional/clientes/${id}`);
export const obtenerReportes = (semanas = 8) => solicitar(`/profesional/reportes?semanas=${semanas}`);

// Estado que se muestra de una cita: una confirmada que ya comenzó se dio por realizada y una pendiente que ya pasó
// quedó sin confirmar a tiempo.
export function estadoCita({ estado, pasada }) {
  if (estado === 'cancelada') return { clave: 'cancelada', nombre: 'Cancelada' };
  if (estado === 'confirmada') return pasada ? { clave: 'realizada', nombre: 'Realizada' } : { clave: 'confirmada', nombre: 'Confirmada' };
  return pasada ? { clave: 'sin-confirmar', nombre: 'Sin confirmar' } : { clave: 'pendiente', nombre: 'Pendiente' };
}

// "12 nov 2026" (las fechas de la agenda vienen en hora de Chile como "AAAA-MM-DD").
export const fechaCorta = (fecha) =>
  new Intl.DateTimeFormat('es-CL', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(`${fecha}T12:00:00Z`)).replace('.', '');

// "9 nov" para el eje de las semanas.
export const diaYMes = (fecha) =>
  new Intl.DateTimeFormat('es-CL', { day: 'numeric', month: 'short', timeZone: 'UTC' })
    .format(new Date(`${fecha}T12:00:00Z`)).replace('.', '');

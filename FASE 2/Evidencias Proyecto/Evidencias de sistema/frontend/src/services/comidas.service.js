import reglas from '@shared/reglas.json';
import { solicitar } from './api.js';

// Gestor de alimentación (FS-HU-09 y FS-HU-10). Sin fecha, la API usa el día de hoy en Chile.
const conFecha = (ruta, fecha) => (fecha ? `${ruta}?fecha=${fecha}` : ruta);
export const obtenerDia = (fecha) => solicitar(conFecha('/comidas', fecha));
export const obtenerSemana = (fecha) => solicitar(conFecha('/comidas/semana', fecha));
export const buscarAlimentos = (texto) => solicitar(`/comidas/alimentos?q=${encodeURIComponent(texto)}`);
export const registrarComida = (datos) => solicitar('/comidas', { metodo: 'POST', cuerpo: datos });
export const actualizarComida = (id, datos) => solicitar(`/comidas/${id}`, { metodo: 'PATCH', cuerpo: datos });
export const eliminarComida = (id) => solicitar(`/comidas/${id}`, { metodo: 'DELETE' });

export const MOMENTOS = reglas.comidas.momentos;
export const { min: GRAMOS_MIN, max: GRAMOS_MAX } = reglas.comidas.gramos;

// Mismo criterio que la API: desayuno hasta las 10:30, media mañana hasta las 12:30, almuerzo hasta las 16:00,
// merienda hasta las 19:30 y cena el resto.
export function momentoSegunHora(ahora = new Date()) {
  const minutos = ahora.getHours() * 60 + ahora.getMinutes();
  if (minutos >= 300 && minutos < 630) return 'desayuno';
  if (minutos >= 630 && minutos < 750) return 'media_manana';
  if (minutos >= 750 && minutos < 960) return 'almuerzo';
  if (minutos >= 960 && minutos < 1170) return 'merienda';
  return 'cena';
}

// Aporte de una porción del catálogo (valores por 100 g), igual que el cálculo de la API.
export function aporte(alimento, gramos) {
  const factor = gramos / 100;
  const redondear = (valor) => Math.round(valor * factor * 10) / 10;
  return {
    calorias: Math.round(alimento.calorias * factor),
    proteinasG: redondear(alimento.proteinasG),
    carbohidratosG: redondear(alimento.carbohidratosG),
    grasasG: redondear(alimento.grasasG),
  };
}

// Gramos escritos con coma o punto; null si no es un número dentro del rango permitido.
export function leerGramos(texto) {
  const valor = Number(String(texto).trim().replace(',', '.'));
  return Number.isFinite(valor) && valor >= GRAMOS_MIN && valor <= GRAMOS_MAX ? Math.round(valor * 10) / 10 : null;
}

export function sumarDias(fecha, dias) {
  const dia = new Date(`${fecha}T00:00:00Z`);
  dia.setUTCDate(dia.getUTCDate() + dias);
  return dia.toISOString().slice(0, 10);
}

const fechaLarga = new Intl.DateTimeFormat('es-CL', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
const diaCorto = new Intl.DateTimeFormat('es-CL', { weekday: 'short', timeZone: 'UTC' });
// «Lunes, 26 de octubre»: solo la primera letra en mayúscula, como se escribe en español.
export const nombreDia = (fecha) => {
  const texto = fechaLarga.format(new Date(`${fecha}T00:00:00Z`));
  return texto.charAt(0).toUpperCase() + texto.slice(1);
};
export const diaSemana = (fecha) => {
  const texto = diaCorto.format(new Date(`${fecha}T00:00:00Z`)).replace('.', '');
  return texto.charAt(0).toUpperCase() + texto.slice(1);
};
export const diaMes = (fecha) => `${Number(fecha.slice(8, 10))}/${Number(fecha.slice(5, 7))}`;

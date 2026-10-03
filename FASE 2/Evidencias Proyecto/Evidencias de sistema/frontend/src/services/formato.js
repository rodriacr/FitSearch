// Formatos de presentación en español de Chile (coma decimal y punto de miles).
import reglas from '@shared/reglas.json';

const numero = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 1 });
const fecha = new Intl.DateTimeFormat('es-CL', { day: 'numeric', month: 'short', year: 'numeric' });

export const formatearNumero = (valor) => numero.format(valor);
export const formatearKm = (km) => `${numero.format(km)} km`;
export const formatearFecha = (iso) => fecha.format(new Date(iso));
export const iniciales = (nombre) => nombre.split(/\s+/).filter(Boolean).slice(0, 2).map((parte) => parte[0].toUpperCase()).join('');
export const primerNombre = (nombre) => nombre.trim().split(/\s+/)[0];
export const textoResenas = (total) => `${total} ${total === 1 ? 'reseña' : 'reseñas'}`;

const MODALIDADES = Object.fromEntries(reglas.profesionales.modalidades.map(({ valor, etiqueta }) => [valor, etiqueta]));
export const etiquetaModalidad = (valor) => MODALIDADES[valor] || valor;

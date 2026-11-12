import reglas from '@shared/reglas.json';
import { formatearNumero } from '../../services/formato.js';

// Datos de experiencia del profesional (FS-HU-29) compartidos por su perfil y su ficha pública.
export const precioCLP = (valor) => `$${formatearNumero(valor)}`;
// Buscador público de la Superintendencia de Salud: cualquiera puede comprobar el registro del profesional.
export const URL_SUPERSALUD = 'https://rnpi.superdesalud.gob.cl/';
const ATIENDE = Object.fromEntries(reglas.experiencia.atiendeA.map(({ valor, etiqueta }) => [valor, etiqueta]));
export const etiquetaAtiende = (valor) => ATIENDE[valor] || valor;

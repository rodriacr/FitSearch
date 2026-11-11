import reglas from '@shared/reglas.json';
import { SECCIONES } from '../diseno/secciones.js';

// Textos de cada categoría del directorio (FS-HU-25). La categoría y su etiqueta vienen de shared/reglas.json, las
// mismas que usa el administrador al registrar un establecimiento (FS-HU-30).
const TEXTOS = {
  centro_salud: {
    seccion: 'centros', icono: 'hospital', singular: 'centro de salud', plural: 'centros de salud', este: 'este centro de salud',
    bajada: 'Encuentra centros de salud y clínicas cerca de ti, con su dirección y los profesionales que atienden ahí.',
  },
  gimnasio: {
    seccion: 'gimnasios', icono: 'mancuerna', singular: 'gimnasio', plural: 'gimnasios', este: 'este gimnasio',
    bajada: 'Descubre gimnasios y centros deportivos cerca de ti para entrenar a tu ritmo.',
  },
};

export const CATEGORIAS = Object.fromEntries(reglas.contenido.establecimiento.categorias.map(({ valor, etiqueta }) => [
  valor, { ...TEXTOS[valor], etiqueta, titulo: SECCIONES[TEXTOS[valor].seccion].nombre, ruta: SECCIONES[TEXTOS[valor].seccion].ruta },
]));

export const direccionCompleta = ({ direccion, comuna }) => (comuna ? `${direccion}, ${comuna}` : direccion);

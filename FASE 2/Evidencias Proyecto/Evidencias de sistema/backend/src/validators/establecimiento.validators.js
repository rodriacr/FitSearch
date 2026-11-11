const { param, query } = require('express-validator');
const { profesionales: reglas, contenido } = require('../../../shared/reglas.json');

// Directorio de centros de salud y gimnasios (FS-HU-25). Usa las mismas distancias y el mismo tamaño de página que el
// buscador de profesionales, para que los filtros se vean y funcionen igual.
const CATEGORIAS = contenido.establecimiento.categorias.map((opcion) => opcion.valor);
const ORDENES = ['nombre', 'cercania'];

// Un parámetro repetido llega como lista: se rechaza con un 400 en vez de provocar un error interno.
const unico = (campo, mensaje) => query(campo).optional().custom((valor) => typeof valor === 'string').withMessage(mensaje).bail();

const categoria = query('categoria')
  .custom((valor) => typeof valor === 'string' && CATEGORIAS.includes(valor))
  .withMessage('Indica si buscas centros de salud o gimnasios');

const listar = [
  categoria,
  unico('comuna', 'Indica una sola comuna').trim().isLength({ max: contenido.establecimiento.comuna.max })
    .withMessage(`La comuna admite hasta ${contenido.establecimiento.comuna.max} caracteres`),
  unico('lat', 'Indica una sola latitud').isFloat({ min: -90, max: 90 }).withMessage('La latitud no es válida'),
  unico('lng', 'Indica una sola longitud').isFloat({ min: -180, max: 180 }).withMessage('La longitud no es válida'),
  unico('distanciaKm', 'Indica una sola distancia').isIn(reglas.distanciasKm.map(String))
    .withMessage(`La distancia debe ser una de: ${reglas.distanciasKm.join(', ')} km`),
  unico('orden', 'Indica un solo orden').isIn(ORDENES).withMessage('Selecciona un orden válido'),
  unico('pagina', 'Indica una sola página').isInt({ min: 1, max: 100000 }).withMessage('La página debe ser un entero entre 1 y 100000'),
  unico('limite', 'Indica un solo límite').isInt({ min: 1, max: reglas.porPagina })
    .withMessage(`El límite debe ser un entero entre 1 y ${reglas.porPagina}`),
  // La latitud y la longitud van juntas, y la cercanía no se puede calcular sin ellas.
  query('lat').custom((lat, { req }) => (lat === undefined) === (req.query.lng === undefined))
    .withMessage('Envía la latitud y la longitud juntas'),
  query('distanciaKm').custom((distancia, { req }) => distancia === undefined || req.query.lat !== undefined)
    .withMessage('Para filtrar por distancia se necesita tu ubicación'),
  query('orden').custom((orden, { req }) => orden !== 'cercania' || req.query.lat !== undefined)
    .withMessage('Para ordenar por cercanía se necesita tu ubicación'),
];

const id = param('id').isInt({ min: 1 }).withMessage('El establecimiento indicado no es válido');

module.exports = { listar, categoria, id };

const { body, param, query } = require('express-validator');
const { profesionales: reglas, resena } = require('../../../shared/reglas.json');

const valores = (opciones) => opciones.map((opcion) => opcion.valor);
// "destacados" no se ofrece en el selector de orden: lo usa el Inicio para elegir sus fichas.
const ORDENES = [...valores(reglas.ordenes), 'destacados'];

// Un parámetro repetido llega como lista: se rechaza con un 400 en vez de provocar un error interno.
const unico = (campo, mensaje) => query(campo).optional().custom((valor) => typeof valor === 'string').withMessage(mensaje).bail();

const texto = (campo, max, nombre) => unico(campo, `Indica una sola ${nombre}`)
  .trim().isLength({ max }).withMessage(`La ${nombre} admite hasta ${max} caracteres`);

const listar = [
  unico('q', 'Indica una sola búsqueda').trim().isLength({ max: reglas.busqueda.max })
    .withMessage(`La búsqueda admite hasta ${reglas.busqueda.max} caracteres`),
  texto('especialidad', reglas.especialidad.max, 'especialidad'),
  texto('comuna', reglas.comuna.max, 'comuna'),
  unico('modalidad', 'Indica una sola modalidad').isIn(valores(reglas.filtroModalidad)).withMessage('Selecciona una modalidad válida'),
  unico('calificacionMin', 'Indica una sola calificación mínima').isInt({ min: resena.puntaje.min, max: resena.puntaje.max })
    .withMessage(`La calificación mínima debe ser un entero entre ${resena.puntaje.min} y ${resena.puntaje.max}`),
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

const pagina = [
  unico('pagina', 'Indica una sola página').isInt({ min: 1, max: 100000 }).withMessage('La página debe ser un entero entre 1 y 100000'),
];

const id = (nombre = 'id') => param(nombre).isInt({ min: 1 }).withMessage('El profesional indicado no es válido');

const guardarResena = [
  body('puntaje')
    .notEmpty().withMessage('Elige una calificación de 1 a 5 estrellas').bail()
    .isInt({ min: resena.puntaje.min, max: resena.puntaje.max }).withMessage('Elige una calificación de 1 a 5 estrellas')
    .toInt(),
  body('comentario')
    .optional({ values: 'null' })
    .isString().withMessage('El comentario debe ser un texto').bail()
    .trim()
    .custom((valor) => valor === '' || valor.length >= resena.comentario.min)
    .withMessage(`El comentario debe tener al menos ${resena.comentario.min} caracteres, o puedes dejarlo vacío`)
    .isLength({ max: resena.comentario.max }).withMessage(`El comentario admite hasta ${resena.comentario.max} caracteres`),
];

module.exports = { listar, pagina, id, guardarResena };

const { body } = require('express-validator');
const { profesionales: reglas } = require('../../../shared/reglas.json');

const valores = (opciones) => opciones.map((opcion) => opcion.valor);

// Ficha propia del profesional (FS-HU-04): especialidad del catálogo, descripción opcional, comuna, modalidad
// y ubicación de atención. La comuna y la modalidad las usa el buscador de profesionales (FS-HU-22).
module.exports = [
  body('especialidad')
    .isString().withMessage('Selecciona tu especialidad').bail()
    .trim().isIn(reglas.especialidades).withMessage('Selecciona tu especialidad'),
  body('descripcion')
    .optional({ values: 'falsy' })
    .isString().withMessage('La descripción debe ser un texto').bail()
    .trim().isLength({ max: reglas.descripcion.max }).withMessage(`La descripción admite hasta ${reglas.descripcion.max} caracteres`),
  body('comuna')
    .isString().withMessage('Ingresa la comuna donde atiendes').bail()
    .trim().notEmpty().withMessage('Ingresa la comuna donde atiendes').bail()
    .isLength({ max: reglas.comuna.max }).withMessage(`La comuna admite hasta ${reglas.comuna.max} caracteres`),
  body('modalidad')
    .isIn(valores(reglas.modalidades)).withMessage('Selecciona cómo atiendes'),
  body('ubicacionLat')
    .notEmpty().withMessage('Ingresa la latitud').bail()
    .isFloat({ min: -90, max: 90 }).withMessage('La latitud debe estar entre -90 y 90').toFloat(),
  body('ubicacionLng')
    .notEmpty().withMessage('Ingresa la longitud').bail()
    .isFloat({ min: -180, max: 180 }).withMessage('La longitud debe estar entre -180 y 180').toFloat(),
];

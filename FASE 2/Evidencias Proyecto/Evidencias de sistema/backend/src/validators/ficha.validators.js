const { body } = require('express-validator');

// Ficha del profesional (FS-HU-03): especialidad obligatoria, descripción opcional y ubicación de atención.
module.exports = [
  body('especialidad')
    .trim().notEmpty().withMessage('Selecciona tu especialidad').bail()
    .isLength({ max: 100 }).withMessage('La especialidad admite hasta 100 caracteres'),
  body('descripcion')
    .optional({ values: 'falsy' })
    .trim().isLength({ max: 500 }).withMessage('La descripción admite hasta 500 caracteres'),
  body('ubicacionLat')
    .notEmpty().withMessage('Ingresa la latitud').bail()
    .isFloat({ min: -90, max: 90 }).withMessage('La latitud debe estar entre -90 y 90').toFloat(),
  body('ubicacionLng')
    .notEmpty().withMessage('Ingresa la longitud').bail()
    .isFloat({ min: -180, max: 180 }).withMessage('La longitud debe estar entre -180 y 180').toFloat(),
];

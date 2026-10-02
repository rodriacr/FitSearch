const { query } = require('express-validator');
module.exports = [
  query('comuna').optional().custom((valor) => typeof valor === 'string').withMessage('Indica una sola comuna').bail()
    .trim().isLength({ max: 150 }).withMessage('La comuna admite hasta 150 caracteres'),
  query('especialidad').optional().custom((valor) => typeof valor === 'string').withMessage('La especialidad debe ser un texto').bail()
    .trim().isLength({ max: 100 }).withMessage('La especialidad admite hasta 100 caracteres'),
  query('pagina').optional().custom((valor) => typeof valor === 'string').withMessage('Indica una sola página').bail()
    .isInt({ min: 1, max: 100000 }).withMessage('La página debe ser un entero entre 1 y 100000'),
];

const { body } = require('express-validator');
const { profesionales: reglas } = require('../../../shared/reglas.json');

const valores = (opciones) => opciones.map((opcion) => opcion.valor);
const { latMin, latMax, lngMin, lngMax } = reglas.ubicacionChile;
const texto = (numero) => String(numero).replace('.', ',');

// Ficha propia del profesional (FS-HU-04): especialidad del catálogo, descripción opcional, comuna, modalidad,
// dirección y ubicación de atención. La comuna y la modalidad las usa el buscador de profesionales (FS-HU-22).
// SC-24: la dirección es obligatoria si atiende presencial o de ambas formas, y las coordenadas deben estar en Chile
// (el mismo recuadro que limita el mapa, en shared/reglas.json).
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
  body('direccion')
    .custom((valor, { req }) => {
      const vacia = valor === undefined || valor === null || (typeof valor === 'string' && !valor.trim());
      if (vacia && req.body.modalidad !== 'online') throw new Error('Ingresa la dirección donde atiendes');
      if (!vacia && typeof valor !== 'string') throw new Error('La dirección debe ser un texto');
      if (!vacia && valor.trim().length > reglas.direccion.max) throw new Error(`La dirección admite hasta ${reglas.direccion.max} caracteres`);
      return true;
    }),
  body('ubicacionLat')
    .notEmpty().withMessage('Ingresa la latitud').bail()
    .isFloat({ min: latMin, max: latMax }).withMessage(`La latitud debe estar en Chile (entre ${texto(latMin)} y ${texto(latMax)})`).toFloat(),
  body('ubicacionLng')
    .notEmpty().withMessage('Ingresa la longitud').bail()
    .isFloat({ min: lngMin, max: lngMax }).withMessage(`La longitud debe estar en Chile (entre ${texto(lngMin)} y ${texto(lngMax)})`).toFloat(),
];

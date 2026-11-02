// Validaciones del gestor de alimentación (FS-HU-09 y FS-HU-10). Los límites vienen de shared/reglas.json.
const { body, param, query } = require('express-validator');
const { comidas: reglas } = require('../../../shared/reglas.json');

const MOMENTOS = reglas.momentos.map(({ valor }) => valor);
const esFecha = (valor) => /^\d{4}-\d{2}-\d{2}$/.test(valor) && new Date(`${valor}T00:00:00Z`).toISOString().slice(0, 10) === valor;
const mensajeFecha = 'La fecha debe tener el formato AAAA-MM-DD';
const mensajeGramos = `Indica entre ${reglas.gramos.min} y ${reglas.gramos.max} gramos`;

const id = param('id').isInt({ min: 1 }).withMessage('El registro indicado no es válido');
const fechaConsulta = query('fecha').optional().custom(esFecha).withMessage(mensajeFecha);
const fecha = body('fecha').optional().custom(esFecha).withMessage(mensajeFecha);

const busqueda = query('q')
  .isString().withMessage(`Escribe al menos ${reglas.busqueda.min} letras`).bail()
  .trim()
  .isLength({ min: reglas.busqueda.min, max: reglas.busqueda.max })
  .withMessage(`Escribe entre ${reglas.busqueda.min} y ${reglas.busqueda.max} caracteres`);

const momento = body('momento').isIn(MOMENTOS).withMessage('Elige el momento del día');
const momentoOpcional = body('momento').optional().isIn(MOMENTOS).withMessage('Elige el momento del día');
const alimentoId = body('alimentoId').isInt({ min: 1 }).withMessage('Elige un alimento del catálogo').bail().toInt();
const gramos = body('gramos')
  .isFloat({ min: reglas.gramos.min, max: reglas.gramos.max }).withMessage(mensajeGramos).bail()
  .toFloat()
  .customSanitizer((valor) => Math.round(valor * 10) / 10);
const gramosOpcional = body('gramos').optional()
  .isFloat({ min: reglas.gramos.min, max: reglas.gramos.max }).withMessage(mensajeGramos).bail()
  .toFloat()
  .customSanitizer((valor) => Math.round(valor * 10) / 10);
const algunCambio = body().custom((cuerpo) => cuerpo?.gramos !== undefined || cuerpo?.momento !== undefined)
  .withMessage('Indica los gramos o el momento del día');

module.exports = { id, fechaConsulta, fecha, busqueda, momento, momentoOpcional, alimentoId, gramos, gramosOpcional, algunCambio };

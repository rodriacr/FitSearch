// Validaciones del asistente IA (FS-HU-07). Los límites vienen de shared/reglas.json.
const { body, param } = require('express-validator');
const { asistente: reglas } = require('../../../shared/reglas.json');

const id = param('id').isInt({ min: 1 }).withMessage('La conversación indicada no es válida');

const mensaje = body('mensaje')
  .isString().withMessage('Escribe un mensaje').bail()
  .trim()
  .notEmpty().withMessage('Escribe un mensaje').bail()
  .isLength({ max: reglas.mensaje.max }).withMessage(`El mensaje admite hasta ${reglas.mensaje.max} caracteres`);

const fijada = body('fijada').isBoolean({ strict: true }).withMessage('Indica si la conversación queda fijada (true o false)');

module.exports = { id, mensaje, fijada };

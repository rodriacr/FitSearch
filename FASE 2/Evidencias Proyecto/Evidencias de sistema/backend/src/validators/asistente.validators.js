// Validaciones del asistente IA (FS-HU-07). Los límites vienen de shared/reglas.json.
const { body, param } = require('express-validator');
const { asistente: reglas } = require('../../../shared/reglas.json');

const id = param('id').isInt({ min: 1 }).withMessage('La conversación indicada no es válida');
const idMensaje = param('id').isInt({ min: 1 }).withMessage('La respuesta indicada no es válida');

const mensaje = body('mensaje')
  .isString().withMessage('Escribe un mensaje').bail()
  .trim()
  .notEmpty().withMessage('Escribe un mensaje').bail()
  .isLength({ max: reglas.mensaje.max }).withMessage(`El mensaje admite hasta ${reglas.mensaje.max} caracteres`);

const fijada = body('fijada').isBoolean({ strict: true }).withMessage('Indica si la conversación queda fijada (true o false)');

// SC-47: valoración (1, -1 o null para quitarla), modalidad y orden de la recomendación. Al menos uno de los tres.
const MODALIDADES = reglas.recomendacion.modalidades.map(({ valor }) => valor);
const CRITERIOS = reglas.recomendacion.criterios.map(({ valor }) => valor);
const cambiosMensaje = [
  body('valoracion').optional({ values: 'undefined' })
    .custom((valor) => valor === null || reglas.valoraciones.includes(valor))
    .withMessage('La valoración debe ser 1 (útil), -1 (no útil) o null'),
  body('modalidad').optional().isIn(MODALIDADES).withMessage(`La modalidad debe ser: ${MODALIDADES.join(' u ')}`),
  body('criterio').optional().isIn(CRITERIOS).withMessage(`El orden debe ser uno de: ${CRITERIOS.join(', ')}`),
  body().custom((cuerpo) => ['valoracion', 'modalidad', 'criterio'].some((campo) => cuerpo?.[campo] !== undefined))
    .withMessage('Indica la valoración, la modalidad o el orden'),
];

// SC-47: permiso para usar el perfil en el asistente.
const PERMISOS = reglas.permisosPerfil.map(({ valor }) => valor);
const permisoPerfil = body('permiso').isIn(PERMISOS).withMessage(`El permiso debe ser uno de: ${PERMISOS.join(', ')}`);

module.exports = { id, idMensaje, mensaje, fijada, cambiosMensaje, permisoPerfil };

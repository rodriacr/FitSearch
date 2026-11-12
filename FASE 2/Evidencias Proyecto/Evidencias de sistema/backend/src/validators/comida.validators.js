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

const periodo = query('periodo').optional().isIn(['semana', 'mes']).withMessage('Elige semana o mes');
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

// Plan de alimentación (11-11-2026). Elegir el plan: el de la meta o uno de la lista de personalizados.
const plan = [
  body('tipo').isIn(['meta', 'personalizado']).withMessage('Elige «Según tu meta» o «Personalizado»'),
  body('personalizadoId').optional({ values: 'null' }).isInt({ min: 1 }).withMessage('Elige uno de tus planes personalizados').toInt(),
];
// Un plan personalizado de la lista: nombre y tres porcentajes enteros (el servicio exige que sumen 100).
const personalizado = [
  body('nombre').isString().withMessage('Ponle un nombre a tu plan'),
  body(['proteinas', 'carbohidratos', 'grasas']).isInt().withMessage('Escribe un porcentaje entero').toInt(),
  body('usar').optional().isBoolean({ strict: true }).withMessage('Indica si quieres usarlo desde hoy'),
];
const idPersonalizado = param('id').isInt({ min: 1 }).withMessage('El plan indicado no es válido').toInt();
// Meta de peso: el peso al que se quiere llegar y el ritmo semanal (el servicio revisa que tengan sentido con el perfil).
const metaPeso = [
  body('pesoObjetivoKg').isFloat({ min: 30, max: 300 }).withMessage('Escribe un peso entre 30 y 300 kg').toFloat(),
  body('ritmoSemanalKg').isFloat({ gt: 0 }).withMessage('Elige a qué ritmo quieres avanzar').toFloat(),
];

module.exports = { plan, personalizado, idPersonalizado, metaPeso, id, fechaConsulta, fecha, busqueda, periodo, momento, momentoOpcional, alimentoId, gramos, gramosOpcional, algunCambio };

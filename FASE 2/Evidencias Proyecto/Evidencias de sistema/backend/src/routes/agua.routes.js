const { Router } = require('express');
const { body, param, query } = require('express-validator');
const validar = require('../middlewares/validar');
const servicio = require('../services/agua.service');
const { autenticar, autorizarRoles } = require('../middlewares/autenticar');
const { agua: reglas } = require('../../../shared/reglas.json');

// Registro de agua (FS-HU-33): /api/agua. Solo cuentas de usuario, como Comidas (DAS, D25). Trabaja con el día de hoy
// en Chile («Agua hoy» del Inicio); desde Comidas también se puede sumar a un día anterior.
const router = Router();
router.use(autenticar, autorizarRoles('usuario'));

const formato = (ml) => ml.toLocaleString('es-CL');
// Vacía, negativa, con decimales o demasiado alta: no se guarda y se indica el rango permitido.
const ml = body('ml')
  .isInt({ min: reglas.registro.min, max: reglas.registro.max })
  .withMessage(`Indica entre ${formato(reglas.registro.min)} y ${formato(reglas.registro.max)} ml`)
  .bail()
  .toInt();
const id = param('id').isInt({ min: 1 }).withMessage('El registro indicado no es válido');
// Desde Comidas se suma al día que se está viendo (AAAA-MM-DD); sin fecha, a hoy.
const esFecha = (valor) => typeof valor === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(valor)
  && new Date(`${valor}T00:00:00Z`).toISOString().slice(0, 10) === valor;
const fecha = body('fecha').optional().custom(esFecha).withMessage('La fecha debe tener el formato AAAA-MM-DD');
const fechaConsulta = query('fecha').optional().custom(esFecha).withMessage('La fecha debe tener el formato AAAA-MM-DD');

router.get('/', fechaConsulta, validar, async (req, res) => res.json(await servicio.delDia(req.usuario.id, req.query.fecha ?? null)));
router.post('/', ml, fecha, validar,
  async (req, res) => res.status(201).json(await servicio.agregar(req.usuario.id, req.body.ml, req.body.fecha ?? null)));
router.delete('/:id', id, fechaConsulta, validar,
  async (req, res) => res.json(await servicio.eliminar(req.usuario.id, Number(req.params.id), req.query.fecha ?? null)));

module.exports = router;

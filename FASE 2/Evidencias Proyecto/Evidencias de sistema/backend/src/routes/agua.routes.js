const { Router } = require('express');
const { body, param } = require('express-validator');
const validar = require('../middlewares/validar');
const servicio = require('../services/agua.service');
const { autenticar, autorizarRoles } = require('../middlewares/autenticar');
const { agua: reglas } = require('../../../shared/reglas.json');

// Registro de agua (FS-HU-33): /api/agua. Solo cuentas de usuario, como Comidas (DAS, D25). Trabaja siempre con el
// día de hoy en Chile: el Inicio muestra «Agua hoy».
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

router.get('/', async (req, res) => res.json(await servicio.hoy(req.usuario.id)));
router.post('/', ml, validar, async (req, res) => res.status(201).json(await servicio.agregar(req.usuario.id, req.body.ml)));
router.delete('/:id', id, validar, async (req, res) => res.json(await servicio.eliminar(req.usuario.id, Number(req.params.id))));

module.exports = router;

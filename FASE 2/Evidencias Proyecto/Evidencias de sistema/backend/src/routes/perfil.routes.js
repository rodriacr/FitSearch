const { Router } = require('express');
const controlador = require('../controllers/perfil.controller');
const validadores = require('../validators/perfil.validators');
const validar = require('../middlewares/validar');
const { autenticar, autorizarRoles } = require('../middlewares/autenticar');

const router = Router();

router.use(autenticar);
router.get('/', controlador.obtener);
router.put('/tipo-cuenta', validadores.tipoCuenta, validar, controlador.actualizarTipoCuenta);
// Datos personales, objetivos y salud son del asistente del usuario: una cuenta profesional no los completa (DAS, D25).
router.put('/', autorizarRoles('usuario'), validadores.actualizar, validar, controlador.actualizar);
router.put('/objetivos', autorizarRoles('usuario'), validadores.objetivos, validar, controlador.actualizarObjetivos);
router.put('/salud', autorizarRoles('usuario'), validadores.salud, validar, controlador.actualizarSalud);

module.exports = router;

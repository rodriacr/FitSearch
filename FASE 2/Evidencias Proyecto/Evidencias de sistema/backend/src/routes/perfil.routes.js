const { Router } = require('express');
const controlador = require('../controllers/perfil.controller');
const validadores = require('../validators/perfil.validators');
const validar = require('../middlewares/validar');
const { autenticar } = require('../middlewares/autenticar');

const router = Router();

router.use(autenticar);
router.get('/', controlador.obtener);
router.put('/tipo-cuenta', validadores.tipoCuenta, validar, controlador.actualizarTipoCuenta);
router.put('/', validadores.actualizar, validar, controlador.actualizar);
router.put('/objetivos', validadores.objetivos, validar, controlador.actualizarObjetivos);
router.put('/salud', validadores.salud, validar, controlador.actualizarSalud);

module.exports = router;

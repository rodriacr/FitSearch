const { Router } = require('express');
const controlador = require('../controllers/profesional.controller');
const validadores = require('../validators/profesional.validators');
const validar = require('../middlewares/validar');
const { autenticar, autorizarRoles } = require('../middlewares/autenticar');
const validadoresFicha = require('../validators/ficha.validators');
const router = Router();
router.use(autenticar);
router.get('/especialidades', controlador.especialidades);
// Ficha pública del propio profesional (solo cuentas con rol "profesional").
router.get('/mi-ficha', autorizarRoles('profesional'), controlador.obtenerMiFicha);
router.put('/mi-ficha', autorizarRoles('profesional'), validadoresFicha, validar, controlador.guardarMiFicha);
router.get('/', validadores, validar, controlador.listar);
module.exports = router;

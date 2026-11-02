const { Router } = require('express');
const controlador = require('../controllers/comida.controller');
const v = require('../validators/comida.validators');
const validar = require('../middlewares/validar');
const { autenticar, autorizarRoles } = require('../middlewares/autenticar');

// Gestor de alimentación (FS-HU-09 y FS-HU-10; DAS CU-06). Solo cuentas de usuario (DAS, D25): el profesional recibe 403.
const router = Router();
router.use(autenticar, autorizarRoles('usuario'));
router.get('/alimentos', v.busqueda, validar, controlador.alimentos);
router.get('/semana', v.fechaConsulta, validar, controlador.semana);
router.get('/', v.fechaConsulta, validar, controlador.delDia);
router.post('/', v.fecha, v.momento, v.alimentoId, v.gramos, validar, controlador.agregar);
router.patch('/:id', v.id, v.algunCambio, v.gramosOpcional, v.momentoOpcional, validar, controlador.actualizar);
router.delete('/:id', v.id, validar, controlador.eliminar);
module.exports = router;

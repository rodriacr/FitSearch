const { Router } = require('express');
const controlador = require('../controllers/comida.controller');
const v = require('../validators/comida.validators');
const validar = require('../middlewares/validar');
const { autenticar, autorizarRoles } = require('../middlewares/autenticar');

// Gestor de alimentación (FS-HU-09, FS-HU-10 y las estadísticas de FS-HU-26; DAS CU-06). Solo cuentas de usuario (DAS, D25): el profesional recibe 403.
const router = Router();
router.use(autenticar, autorizarRoles('usuario'));
router.get('/alimentos', v.busqueda, validar, controlador.alimentos);
router.get('/semana', v.fechaConsulta, validar, controlador.semana);
// Plan de alimentación (11-11-2026): según la meta del perfil o uno de la lista de personalizados, y la meta de peso.
router.get('/plan', controlador.plan);
router.put('/plan', v.plan, validar, controlador.guardarPlan);
router.post('/plan/personalizados', v.personalizado, validar, controlador.crearPersonalizado);
router.put('/plan/personalizados/:id', v.idPersonalizado, v.personalizado, validar, controlador.actualizarPersonalizado);
router.delete('/plan/personalizados/:id', v.idPersonalizado, validar, controlador.eliminarPersonalizado);
router.put('/plan/meta-peso', v.metaPeso, validar, controlador.guardarMetaPeso);
router.delete('/plan/meta-peso', controlador.eliminarMetaPeso);
router.get('/estadisticas', v.periodo, v.fechaConsulta, validar, controlador.estadisticas);
router.get('/', v.fechaConsulta, validar, controlador.delDia);
router.post('/', v.fecha, v.momento, v.alimentoId, v.gramos, validar, controlador.agregar);
router.patch('/:id', v.id, v.algunCambio, v.gramosOpcional, v.momentoOpcional, validar, controlador.actualizar);
router.delete('/:id', v.id, validar, controlador.eliminar);
module.exports = router;

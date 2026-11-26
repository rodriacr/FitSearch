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
// Racha de registro (25-11-2026): días seguidos con al menos una comida registrada.
router.get('/racha', controlador.racha);
// Planes de comidas (SC-44): hasta 10 por persona, uno en uso; «Lo comí» registra un momento del plan en el día.
router.get('/planes-comida', controlador.planesComida);
router.post('/planes-comida', v.planComida, validar, controlador.crearPlanComida);
router.put('/planes-comida/:id', v.idPlanComida, v.planComida, validar, controlador.actualizarPlanComida);
router.delete('/planes-comida/:id', v.idPlanComida, validar, controlador.eliminarPlanComida);
router.put('/planes-comida/:id/uso', v.idPlanComida, v.usoPlanComida, validar, controlador.usarPlanComida);
router.post('/planes-comida/:id/registrar', v.idPlanComida, v.registrarPlanComida, validar, controlador.registrarPlanComida);
// Plan de macronutrientes (antes «Plan de alimentación», 11-11-2026; renombrado en SC-44): según la meta del perfil o uno
// de la lista de personalizados, y la meta de peso.
router.get('/plan', controlador.plan);
router.put('/plan', v.plan, validar, controlador.guardarPlan);
router.post('/plan/personalizados', v.personalizado, validar, controlador.crearPersonalizado);
router.put('/plan/personalizados/:id', v.idPersonalizado, v.personalizado, validar, controlador.actualizarPersonalizado);
router.delete('/plan/personalizados/:id', v.idPersonalizado, validar, controlador.eliminarPersonalizado);
router.put('/plan/meta-peso', v.metaPeso, validar, controlador.guardarMetaPeso);
router.delete('/plan/meta-peso', controlador.eliminarMetaPeso);
// Historial de peso (SC-43): anotar o borrar un pesaje; responden el plan completo.
router.post('/plan/pesos', v.peso, validar, controlador.registrarPeso);
router.delete('/plan/pesos/:id', v.idPeso, validar, controlador.eliminarPeso);
router.get('/estadisticas', v.periodo, v.fechaConsulta, validar, controlador.estadisticas);
router.get('/', v.fechaConsulta, validar, controlador.delDia);
router.post('/', v.fecha, v.momento, v.alimentoId, v.gramos, validar, controlador.agregar);
router.patch('/:id', v.id, v.algunCambio, v.gramosOpcional, v.momentoOpcional, validar, controlador.actualizar);
router.delete('/:id', v.id, validar, controlador.eliminar);
module.exports = router;

const { Router } = require('express');
const controlador = require('../controllers/asistente.controller');
const validadores = require('../validators/asistente.validators');
const validar = require('../middlewares/validar');
const { autenticar, autorizarRoles } = require('../middlewares/autenticar');

// Asistente IA del usuario (FS-HU-07, DAS D33). Solo cuentas de usuario (DAS, D25): el profesional recibe 403.
const router = Router();
router.use(autenticar, autorizarRoles('usuario'));
router.get('/estado', controlador.estado);
router.get('/conversaciones', controlador.listar);
router.post('/conversaciones', validadores.mensaje, validar, controlador.iniciar);
router.get('/conversaciones/:id', validadores.id, validar, controlador.obtener);
router.post('/conversaciones/:id/mensajes', validadores.id, validadores.mensaje, validar, controlador.enviar);
router.patch('/conversaciones/:id', validadores.id, validadores.fijada, validar, controlador.fijar);
router.delete('/conversaciones/:id', validadores.id, validar, controlador.eliminar);
module.exports = router;

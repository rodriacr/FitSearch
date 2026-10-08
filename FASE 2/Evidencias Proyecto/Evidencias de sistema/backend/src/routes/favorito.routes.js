const { Router } = require('express');
const controlador = require('../controllers/favorito.controller');
const validadores = require('../validators/profesional.validators');
const validar = require('../middlewares/validar');
const { autenticar, autorizarRoles } = require('../middlewares/autenticar');

// Favoritos del usuario con sesión (FS-HU-23). PUT y DELETE son idempotentes. Solo cuentas de usuario (DAS, D25).
const router = Router();
router.use(autenticar, autorizarRoles('usuario'));
router.get('/', validadores.pagina, validar, controlador.listar);
router.put('/:profesionalId', validadores.id('profesionalId'), validar, controlador.agregar);
router.delete('/:profesionalId', validadores.id('profesionalId'), validar, controlador.quitar);
module.exports = router;

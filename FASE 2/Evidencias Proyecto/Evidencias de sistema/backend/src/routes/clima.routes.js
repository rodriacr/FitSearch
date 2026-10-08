const { Router } = require('express');
const controlador = require('../controllers/clima.controller');
const { autenticar, autorizarRoles } = require('../middlewares/autenticar');

// Clima del Inicio del profesional (DAS, D26).
const router = Router();
router.use(autenticar, autorizarRoles('profesional'));
router.get('/', controlador.actual);
module.exports = router;

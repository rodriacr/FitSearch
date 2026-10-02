const { Router } = require('express');
const controlador = require('../controllers/auth.controller');
const validadores = require('../validators/auth.validators');
const validar = require('../middlewares/validar');
const { autenticar } = require('../middlewares/autenticar');

const router = Router();

router.post('/registro', validadores.registro, validar, controlador.registrar);
router.post('/login', validadores.inicioSesion, validar, controlador.iniciarSesion);
router.post('/logout', autenticar, controlador.cerrarSesion);

module.exports = router;

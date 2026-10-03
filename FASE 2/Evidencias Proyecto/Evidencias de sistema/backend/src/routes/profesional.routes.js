const { Router } = require('express');
const controlador = require('../controllers/profesional.controller');
const resenas = require('../controllers/resena.controller');
const validadores = require('../validators/profesional.validators');
const validar = require('../middlewares/validar');
const { autenticar, autorizarRoles } = require('../middlewares/autenticar');

const router = Router();
router.use(autenticar);
router.get('/filtros', controlador.filtros);
router.get('/', validadores.listar, validar, controlador.listar);
router.get('/:id', validadores.id(), validar, controlador.ficha);
// Reseñas (FS-HU-24): cualquiera con sesión las lee; solo las cuentas de usuario califican.
router.get('/:id/resenas', validadores.id(), validadores.pagina, validar, resenas.listar);
router.put('/:id/resenas', autorizarRoles('usuario'), validadores.id(), validadores.guardarResena, validar, resenas.guardar);
router.delete('/:id/resenas', autorizarRoles('usuario'), validadores.id(), validar, resenas.eliminar);
module.exports = router;

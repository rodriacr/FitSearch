const { Router } = require('express');
const controlador = require('../controllers/profesional.controller');
const resenas = require('../controllers/resena.controller');
const validadores = require('../validators/profesional.validators');
const validadoresFicha = require('../validators/ficha.validators');
const validar = require('../middlewares/validar');
const { autenticar, autorizarRoles } = require('../middlewares/autenticar');

const router = Router();
router.use(autenticar);
// El buscador es del usuario (DAS, D25). La ficha pública por id la ve también el profesional (vista previa de la suya).
router.get('/filtros', autorizarRoles('usuario'), controlador.filtros);
// Ficha propia del profesional (FS-HU-04). Va antes de "/:id" para que "mi-ficha" no se lea como un id.
router.get('/mi-ficha', autorizarRoles('profesional'), controlador.obtenerMiFicha);
router.put('/mi-ficha', autorizarRoles('profesional'), validadoresFicha, validar, controlador.guardarMiFicha);
router.get('/', autorizarRoles('usuario'), validadores.listar, validar, controlador.listar);
router.get('/:id', validadores.id(), validar, controlador.ficha);
// Reseñas (FS-HU-24): cualquiera con sesión las lee; solo las cuentas de usuario califican.
router.get('/:id/resenas', validadores.id(), validadores.pagina, validar, resenas.listar);
router.put('/:id/resenas', autorizarRoles('usuario'), validadores.id(), validadores.guardarResena, validar, resenas.guardar);
router.delete('/:id/resenas', autorizarRoles('usuario'), validadores.id(), validar, resenas.eliminar);
module.exports = router;

const { Router } = require('express');
const controlador = require('../controllers/profesional.controller');
const resenas = require('../controllers/resena.controller');
const validadores = require('../validators/profesional.validators');
const validar = require('../middlewares/validar');
const { autenticar, autorizarRoles } = require('../middlewares/autenticar');

const router = Router();

// Middleware global: A partir de aquí, todas las rutas requieren que el usuario haya iniciado sesión
router.use(autenticar);

// ==========================================
// 1. RUTAS ESTÁTICAS Y DE CLAUDE (Deben ir arriba de /:id)
// ==========================================
router.get('/filtros', controlador.filtros);

// Las nuevas rutas para el Perfil Profesional (Integración Claude)
// Solo los usuarios que sean profesionales deberían editar su ficha
router.get('/mi-ficha', autorizarRoles('profesional'), controlador.obtenerMiFicha);

// El frontend de Claude enviaba un 'PUT', pero por seguridad soportamos POST y PUT
router.post('/mi-ficha', autorizarRoles('profesional'), controlador.guardarMiFicha);
router.put('/mi-ficha', autorizarRoles('profesional'), controlador.guardarMiFicha);


// ==========================================
// 2. RUTAS DINÁMICAS Y BÚSQUEDA (Del equipo)
// ==========================================
router.get('/', validadores.listar, validar, controlador.listar);

// Esta es la ruta dinámica que atrapa cualquier otra cosa (por eso va después)
router.get('/:id', validadores.id(), validar, controlador.ficha);

// ==========================================
// 3. RUTAS DE RESEÑAS (FS-HU-24)
// ==========================================
// Cualquiera con sesión las lee; solo las cuentas de usuario califican.
router.get('/:id/resenas', validadores.id(), validadores.pagina, validar, resenas.listar);
router.put('/:id/resenas', autorizarRoles('usuario'), validadores.id(), validadores.guardarResena, validar, resenas.guardar);
router.delete('/:id/resenas', autorizarRoles('usuario'), validadores.id(), validar, resenas.eliminar);

module.exports = router;
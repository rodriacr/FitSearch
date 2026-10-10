const { Router } = require('express');
const { query, param, body, matchedData } = require('express-validator');
const { autenticar, autorizarRoles } = require('../middlewares/autenticar');
const validar = require('../middlewares/validar');
const servicio = require('../services/administrador.service');

const router = Router();
router.use(autenticar, autorizarRoles('administrador'));
const paginacion = [
  query('q').default('').isString().bail().trim().isLength({ max: 100 }),
  query('pagina').default(1).isInt({ min: 1, max: 100000 }).toInt(),
  query('limite').default(12).isInt({ min: 1, max: 50 }).toInt(),
];
router.get('/resumen', query('dias').default(30).isIn(['7', '30', '90', 7, 30, 90]).toInt(), validar,
  async (req, res) => res.json(await servicio.resumen(matchedData(req).dias)));
router.get('/usuarios', paginacion, query('rol').default('').isIn(['', 'usuario', 'profesional', 'administrador']), query('estadoCuenta').default('').isIn(['', 'activos', 'inactivos']), validar,
  async (req, res) => res.json(await servicio.listarUsuarios(matchedData(req))));
router.get('/profesionales', paginacion, query('estado').default('').isIn(['', 'pendientes', 'verificados', 'rechazados']), validar,
  async (req, res) => res.json(await servicio.listarProfesionales(matchedData(req))));
router.get('/profesionales/:id', param('id').isInt({ min: 1 }).toInt(), validar,
  async (req, res) => res.json(await servicio.detalleProfesional(matchedData(req).id)));
router.patch('/usuarios/:id/estado', param('id').isInt({ min: 1 }).toInt(), body('activo').custom((v) => typeof v === 'boolean'), validar,
  async (req, res) => { const { id, activo } = matchedData(req); res.json(await servicio.cambiarEstadoUsuario(id, activo)); });
router.post('/profesionales/:id/decision', param('id').isInt({ min: 1 }).toInt(),
  body('accion').isIn(['aprobar', 'rechazar', 'revocar']), body('revision').isInt({ min: 0 }).toInt(),
  body('motivo').default('').isString().bail().trim().isLength({ max: 500 }).custom((v, { req }) => req.body.accion === 'aprobar' || v.length >= 5), validar,
  async (req, res) => { const { id, ...datos } = matchedData(req); res.json(await require('../models/verificacion.model').decidir(id, { ...datos, administradorId: req.usuario.id })); });
module.exports = router;

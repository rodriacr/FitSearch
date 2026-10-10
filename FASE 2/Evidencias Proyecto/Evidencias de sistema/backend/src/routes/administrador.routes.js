const { Router } = require('express');
const { query, param, matchedData } = require('express-validator');
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
router.get('/usuarios', paginacion, query('rol').default('').isIn(['', 'usuario', 'profesional', 'administrador']), validar,
  async (req, res) => res.json(await servicio.listarUsuarios(matchedData(req))));
router.get('/profesionales', paginacion, query('estado').default('').isIn(['', 'pendientes', 'verificados']), validar,
  async (req, res) => res.json(await servicio.listarProfesionales(matchedData(req))));
router.get('/profesionales/:id', param('id').isInt({ min: 1 }).toInt(), validar,
  async (req, res) => res.json(await servicio.detalleProfesional(matchedData(req).id)));
module.exports = router;

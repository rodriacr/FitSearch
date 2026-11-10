// Clientes (FS-HU-27) y reportes (FS-HU-28) del profesional. Solo el propio profesional ve su actividad.
const { Router } = require('express');
const { param, query, matchedData } = require('express-validator');
const { autenticar, autorizarRoles } = require('../middlewares/autenticar');
const validar = require('../middlewares/validar');
const servicio = require('../services/actividadProfesional.service');

const router = Router();
router.use(autenticar, autorizarRoles('profesional'));

router.get('/clientes', async (req, res) => res.json(await servicio.listarClientes(req.usuario.id)));

router.get(
  '/clientes/:id',
  param('id').isInt({ min: 1, max: 2147483647 }).withMessage('El cliente no es válido').toInt(),
  validar,
  async (req, res) => res.json(await servicio.historialCliente(req.usuario.id, matchedData(req).id)),
);

router.get(
  '/reportes',
  query('semanas').optional().isInt({ min: 4, max: 26 }).withMessage('Elige entre 4 y 26 semanas').toInt(),
  validar,
  async (req, res) => res.json(await servicio.reportes(req.usuario.id, matchedData(req))),
);

module.exports = router;

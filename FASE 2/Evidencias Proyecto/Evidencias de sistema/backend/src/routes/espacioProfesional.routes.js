// Clientes (FS-HU-27) y reportes (FS-HU-28) del espacio del profesional.
const { Router } = require('express');
const { param, query, matchedData } = require('express-validator');
const { autenticar, autorizarRoles } = require('../middlewares/autenticar');
const validar = require('../middlewares/validar');
const servicio = require('../services/espacioProfesional.service');

const router = Router();
router.use(autenticar, autorizarRoles('profesional'));

router.get('/clientes', async (req, res) => res.json(await servicio.clientes(req.usuario.id)));
router.get('/clientes/:id', param('id').isInt({ min: 1, max: 2147483647 }).withMessage('El cliente indicado no es válido').toInt(), validar,
  async (req, res) => res.json(await servicio.historial(req.usuario.id, matchedData(req).id)));
router.get('/reportes', query('semanas').optional().isInt({ min: 4, max: 26 }).withMessage('Elige entre 4 y 26 semanas').toInt(), validar,
  async (req, res) => res.json(await servicio.reportes(req.usuario.id, matchedData(req).semanas || 8)));

module.exports = router;

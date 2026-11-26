const { Router } = require('express');
const servicio = require('../services/logro.service');
const { autenticar, autorizarRoles } = require('../middlewares/autenticar');

// Logros y medallas (25-11-2026). Solo cuentas de usuario: el profesional recibe 403.
const router = Router();
router.use(autenticar, autorizarRoles('usuario'));
router.get('/', async (req, res) => res.json(await servicio.resumen(req.usuario.id)));
// El aviso de medalla nueva se muestra una sola vez: al cerrarlo, las medallas quedan vistas.
router.post('/vistas', async (req, res) => {
  await servicio.marcarVistas(req.usuario.id);
  res.status(204).end();
});

module.exports = router;

const { Router } = require('express');
const especialidades = require('../models/especialidad.model');

// Catálogo público de especialidades activas (FS-HU-30): lo usan la portada, sin sesión, y la ficha del profesional.
const router = Router();
router.get('/', async (req, res) => res.json({ especialidades: await especialidades.nombresActivos() }));
module.exports = router;

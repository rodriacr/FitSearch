const { Router } = require('express');
const authRoutes = require('./auth.routes');
const perfilRoutes = require('./perfil.routes');

const router = Router();

router.get('/salud', (req, res) => res.json({ estado: 'ok' }));
router.use('/auth', authRoutes);
router.use('/perfil', perfilRoutes);
router.use('/profesionales', require('./profesional.routes'));
router.use('/especialidades', require('./especialidad.routes'));
// Centros de salud y gimnasios (FS-HU-25).
router.use('/establecimientos', require('./establecimiento.routes'));
router.use('/favoritos', require('./favorito.routes'));
router.use('/clima', require('./clima.routes'));
router.use('/asistente', require('./asistente.routes'));
router.use('/comidas', require('./comida.routes'));
// Registro de agua del Inicio (FS-HU-33).
router.use('/agua', require('./agua.routes'));
router.use('/administrador', require('./administrador.routes'));
router.use('/verificaciones', require('./verificacion.routes'));
router.use('/', require('./agenda.routes'));

module.exports = router;

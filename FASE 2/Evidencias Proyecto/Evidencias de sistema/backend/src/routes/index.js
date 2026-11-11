const { Router } = require('express');
const authRoutes = require('./auth.routes');
const perfilRoutes = require('./perfil.routes');

const router = Router();

router.get('/salud', (req, res) => res.json({ estado: 'ok' }));
router.use('/auth', authRoutes);
router.use('/perfil', perfilRoutes);
router.use('/profesionales', require('./profesional.routes'));
router.use('/favoritos', require('./favorito.routes'));
router.use('/clima', require('./clima.routes'));
router.use('/asistente', require('./asistente.routes'));
router.use('/comidas', require('./comida.routes'));
router.use('/administrador', require('./administrador.routes'));
router.use('/verificaciones', require('./verificacion.routes'));
// Clientes y reportes del profesional (FS-HU-27 y FS-HU-28) y chat entre usuario y profesional (FS-HU-31).
router.use('/profesional', require('./espacioProfesional.routes'));
router.use('/chats', require('./chats.routes'));
router.use('/', require('./agenda.routes'));

module.exports = router;

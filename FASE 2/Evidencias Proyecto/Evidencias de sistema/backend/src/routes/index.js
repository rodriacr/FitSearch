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
router.use('/administrador', require('./administrador.routes'));

module.exports = router;

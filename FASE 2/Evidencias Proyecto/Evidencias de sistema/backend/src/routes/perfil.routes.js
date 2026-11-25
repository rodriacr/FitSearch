const { Router } = require('express');
const controlador = require('../controllers/perfil.controller');
const validadores = require('../validators/perfil.validators');
const validar = require('../middlewares/validar');
const { autenticar, autorizarRoles } = require('../middlewares/autenticar');

const router = Router();

router.use(autenticar);
// Contacto y presentación propios, compartidos por las cuentas de usuario y profesional.
const cuentaPerfil = require('../services/cuentaPerfil.service');
const cuentaValidadores = require('../validators/cuentaPerfil.validators');
const { matchedData } = require('express-validator');
const { limitarConfirmacionIdentidad } = require('../middlewares/limiteIntentos');
router.get('/cuenta', async (req, res) => res.json(await cuentaPerfil.obtener(req.usuario.id)));
router.get('/configuracion', autorizarRoles('usuario'), async (req, res) =>
  res.json(await cuentaPerfil.obtenerPreferencias(req.usuario.id)));
router.put('/configuracion', autorizarRoles('usuario'), async (req, res) =>
  res.json(await cuentaPerfil.guardarPreferencias(req.usuario.id, req.body)));
// Cambiar el correo pide confirmar la identidad: los intentos fallidos tienen límite por cuenta (SC-41).
router.put('/cuenta', cuentaValidadores.guardar, validar, limitarConfirmacionIdentidad, async (req, res) => {
  const resultado = await cuentaPerfil.guardar(req.usuario.id, matchedData(req), req.usuario.vencimiento);
  req.limite?.exito();
  res.json(resultado);
});
// Derechos sobre los datos (SC-42): descargar una copia y eliminar la cuenta, confirmando la identidad.
const miCuenta = require('../services/miCuenta.service');
router.get('/mis-datos', async (req, res) => {
  const datos = await miCuenta.exportar(req.usuario.id);
  const dia = new Date().toISOString().slice(0, 10);
  res.set('Content-Disposition', `attachment; filename="fitsearch-mis-datos-${dia}.json"`);
  res.set('Cache-Control', 'no-store');
  res.json(datos);
});
router.delete('/cuenta', cuentaValidadores.eliminar, validar, limitarConfirmacionIdentidad, async (req, res) => {
  const { password, credencial } = matchedData(req);
  await miCuenta.eliminar(req.usuario.id, { password, credencial });
  req.limite?.exito();
  res.status(204).end();
});
router.get('/', controlador.obtener);
router.put('/tipo-cuenta', validadores.tipoCuenta, validar, controlador.actualizarTipoCuenta);
// Datos personales, objetivos y salud son del asistente del usuario: una cuenta profesional no los completa (DAS, D25).
router.put('/', autorizarRoles('usuario'), validadores.actualizar, validar, controlador.actualizar);
router.put('/objetivos', autorizarRoles('usuario'), validadores.objetivos, validar, controlador.actualizarObjetivos);
router.put('/salud', autorizarRoles('usuario'), validadores.salud, validar, controlador.actualizarSalud);

module.exports = router;

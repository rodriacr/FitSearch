const authService = require('../services/auth.service');
const recuperacionService = require('../services/recuperacion.service');

async function registrar(req, res) {
  const { nombre, correo, password } = req.body;
  const resultado = await authService.registrar({ nombre, correo, password });
  res.status(201).json(resultado);
}

async function iniciarSesion(req, res) {
  const { correo, password, recordar } = req.body;
  const resultado = await authService.iniciarSesion({ correo, password, recordar });
  res.json(resultado);
}

async function iniciarSesionConGoogle(req, res) {
  const { credencial, recordar } = req.body;
  res.json(await authService.iniciarSesionConGoogle({ credencial, recordar }));
}

// La sesión es sin estado (JWT): el cierre se completa cuando el cliente descarta el token.
function cerrarSesion(req, res) {
  res.status(204).end();
}

async function solicitarRecuperacion(req, res) {
  res.json(await recuperacionService.solicitar(req.body.correo));
}

async function restablecerPassword(req, res) {
  const { token, password } = req.body;
  res.json(await recuperacionService.restablecer({ token, password }));
}

module.exports = { registrar, iniciarSesion, iniciarSesionConGoogle, cerrarSesion, solicitarRecuperacion, restablecerPassword };

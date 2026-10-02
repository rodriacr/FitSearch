const authService = require('../services/auth.service');

async function registrar(req, res) {
  const { nombre, correo, password } = req.body;
  const resultado = await authService.registrar({ nombre, correo, password });
  res.status(201).json(resultado);
}

async function iniciarSesion(req, res) {
  const { correo, password } = req.body;
  const resultado = await authService.iniciarSesion({ correo, password });
  res.json(resultado);
}

// La sesión es sin estado (JWT): el cierre se completa cuando el cliente descarta el token.
function cerrarSesion(req, res) {
  res.status(204).end();
}

module.exports = { registrar, iniciarSesion, cerrarSesion };

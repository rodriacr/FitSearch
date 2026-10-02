const perfilService = require('../services/perfil.service');

async function obtener(req, res) {
  res.json(await perfilService.obtener(req.usuario.id));
}

async function actualizarTipoCuenta(req, res) {
  // El vencimiento del token actual se conserva al emitir el token nuevo con el rol confirmado.
  res.json(await perfilService.actualizarTipoCuenta(req.usuario.id, { rol: req.body.rol }, req.usuario.vencimiento));
}

async function actualizar(req, res) {
  const { pesoKg, alturaCm, edad, sexo, actividadFisica } = req.body;
  res.json(await perfilService.actualizar(req.usuario.id, { pesoKg, alturaCm, edad, sexo, actividadFisica }));
}

async function actualizarObjetivos(req, res) {
  const { objetivoPrincipal, comidasDia, horasSueno } = req.body;
  res.json(await perfilService.actualizarObjetivos(req.usuario.id, { objetivoPrincipal, comidasDia, horasSueno }));
}

async function actualizarSalud(req, res) {
  const { condicionesMedicas, tomaMedicamentos, medicamentos, alergias } = req.body;
  res.json(await perfilService.actualizarSalud(req.usuario.id, { condicionesMedicas, tomaMedicamentos, medicamentos, alergias }));
}

module.exports = { obtener, actualizarTipoCuenta, actualizar, actualizarObjetivos, actualizarSalud };

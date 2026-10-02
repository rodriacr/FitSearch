const perfilService = require('../services/perfil.service');

async function obtener(req, res) {
  res.json(await perfilService.obtener(req.usuario.id));
}

async function actualizar(req, res) {
  const { pesoKg, alturaCm, edad, sexo, actividadFisica } = req.body;
  res.json(await perfilService.actualizar(req.usuario.id, { pesoKg, alturaCm, edad, sexo, actividadFisica }));
}

module.exports = { obtener, actualizar };

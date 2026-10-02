const servicio = require('../services/profesional.service');
async function listar(req, res) {
  res.json(await servicio.listar({ especialidad: req.query.especialidad?.trim() || '', comuna: req.query.comuna?.trim() || '', pagina: Number(req.query.pagina || 1) }));
}
async function especialidades(req, res) { res.json(await servicio.especialidades()); }
module.exports = { listar, especialidades };

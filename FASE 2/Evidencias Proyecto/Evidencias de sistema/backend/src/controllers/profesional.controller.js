const servicio = require('../services/profesional.service');
async function listar(req, res) {
  res.json(await servicio.listar({ especialidad: req.query.especialidad?.trim() || '', comuna: req.query.comuna?.trim() || '', pagina: Number(req.query.pagina || 1) }));
}
async function especialidades(req, res) { res.json(await servicio.especialidades()); }
async function obtenerMiFicha(req, res) { res.json(await servicio.obtenerMiFicha(req.usuario.id)); }
async function guardarMiFicha(req, res) {
  const { especialidad, descripcion, ubicacionLat, ubicacionLng } = req.body;
  res.json(await servicio.guardarMiFicha(req.usuario.id, { especialidad, descripcion: descripcion || null, ubicacionLat, ubicacionLng }));
}
module.exports = { listar, especialidades, obtenerMiFicha, guardarMiFicha };

const servicio = require('../services/clima.service');

async function actual(req, res) { res.json(await servicio.actual(req.usuario.id)); }

module.exports = { actual };

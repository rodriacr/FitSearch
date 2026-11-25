const servicio = require('../services/clima.service');

async function actual(req, res) { res.json(await servicio.actual(req.method === 'POST' ? req.body : req.query)); }

module.exports = { actual };

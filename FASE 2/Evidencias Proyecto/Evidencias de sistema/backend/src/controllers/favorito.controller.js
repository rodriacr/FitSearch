const servicio = require('../services/favorito.service');

async function listar(req, res) { res.json(await servicio.listar(req.usuario.id, Number(req.query.pagina || 1))); }
async function agregar(req, res) { res.json(await servicio.agregar(req.usuario.id, Number(req.params.profesionalId))); }
async function quitar(req, res) { res.json(await servicio.quitar(req.usuario.id, Number(req.params.profesionalId))); }

module.exports = { listar, agregar, quitar };

const servicio = require('../services/asistente.service');

async function estado(req, res) { res.json(await servicio.estado(req.usuario.id)); }
async function listar(req, res) { res.json(await servicio.listar(req.usuario.id)); }
async function obtener(req, res) { res.json(await servicio.obtener(req.usuario.id, Number(req.params.id))); }
async function iniciar(req, res) { res.status(201).json(await servicio.iniciar(req.usuario.id, req.body.mensaje)); }
async function enviar(req, res) { res.status(201).json(await servicio.enviar(req.usuario.id, Number(req.params.id), req.body.mensaje)); }
async function fijar(req, res) { res.json(await servicio.fijar(req.usuario.id, Number(req.params.id), req.body.fijada)); }
async function eliminar(req, res) {
  await servicio.eliminar(req.usuario.id, Number(req.params.id));
  res.status(204).end();
}

module.exports = { estado, listar, obtener, iniciar, enviar, fijar, eliminar };

const servicio = require('../services/resena.service');

async function listar(req, res) {
  res.json(await servicio.listar(Number(req.params.id), req.usuario.id, Number(req.query.pagina || 1)));
}

async function guardar(req, res) {
  const { creada, ...respuesta } = await servicio.guardar(Number(req.params.id), req.usuario, {
    puntaje: req.body.puntaje, comentario: req.body.comentario,
  });
  res.status(creada ? 201 : 200).json(respuesta);
}

async function eliminar(req, res) { res.json(await servicio.eliminar(Number(req.params.id), req.usuario.id)); }

module.exports = { listar, guardar, eliminar };

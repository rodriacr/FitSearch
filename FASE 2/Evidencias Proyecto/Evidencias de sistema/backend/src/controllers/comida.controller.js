const servicio = require('../services/comida.service');
const { fechaEnChile } = require('../utils/fechaChile');

const fechaDe = (valor) => valor || fechaEnChile();

async function alimentos(req, res) { res.json(await servicio.buscarAlimentos(req.query.q)); }
async function delDia(req, res) { res.json(await servicio.delDia(req.usuario.id, fechaDe(req.query.fecha))); }
async function semana(req, res) { res.json(await servicio.semana(req.usuario.id, fechaDe(req.query.fecha))); }
async function agregar(req, res) {
  const { fecha, momento, alimentoId, gramos } = req.body;
  res.status(201).json(await servicio.agregar(req.usuario.id, { fecha: fechaDe(fecha), momento, alimentoId, gramos }));
}
async function actualizar(req, res) {
  const { gramos, momento } = req.body;
  res.json(await servicio.actualizar(req.usuario.id, Number(req.params.id), { gramos, momento }));
}
async function eliminar(req, res) {
  await servicio.eliminar(req.usuario.id, Number(req.params.id));
  res.status(204).end();
}

module.exports = { alimentos, delDia, semana, agregar, actualizar, eliminar };

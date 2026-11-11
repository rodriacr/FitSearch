const servicio = require('../services/comida.service');
const planes = require('../services/planAlimentacion.service');
const { fechaEnChile } = require('../utils/fechaChile');

const fechaDe = (valor) => valor || fechaEnChile();

async function alimentos(req, res) { res.json(await servicio.buscarAlimentos(req.query.q)); }
async function delDia(req, res) { res.json(await servicio.delDia(req.usuario.id, fechaDe(req.query.fecha))); }
async function semana(req, res) { res.json(await servicio.semana(req.usuario.id, fechaDe(req.query.fecha))); }
async function estadisticas(req, res) {
  res.json(await servicio.estadisticas(req.usuario.id, { periodo: req.query.periodo || 'semana', fecha: fechaDe(req.query.fecha) }));
}
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

// Plan de alimentación (11-11-2026): cada cambio responde el plan completo, para que la pantalla se actualice de una vez.
async function plan(req, res) { res.json(await planes.obtener(req.usuario.id)); }
async function guardarPlan(req, res) {
  const { tipo, personalizadoId } = req.body;
  res.json(await planes.guardar(req.usuario.id, { tipo, personalizadoId }));
}
const valoresPersonalizado = ({ nombre, proteinas, carbohidratos, grasas }) => ({ nombre, proteinas, carbohidratos, grasas });
async function crearPersonalizado(req, res) {
  res.status(201).json(await planes.crearPersonalizado(req.usuario.id, { ...valoresPersonalizado(req.body), usar: req.body.usar === true }));
}
async function actualizarPersonalizado(req, res) {
  res.json(await planes.actualizarPersonalizado(req.usuario.id, req.params.id, valoresPersonalizado(req.body)));
}
async function eliminarPersonalizado(req, res) { res.json(await planes.eliminarPersonalizado(req.usuario.id, req.params.id)); }
async function guardarMetaPeso(req, res) {
  const { pesoObjetivoKg, ritmoSemanalKg } = req.body;
  res.json(await planes.guardarMetaPeso(req.usuario.id, { pesoObjetivoKg, ritmoSemanalKg }));
}
async function eliminarMetaPeso(req, res) { res.json(await planes.eliminarMetaPeso(req.usuario.id)); }

module.exports = {
  alimentos, delDia, semana, estadisticas, agregar, actualizar, eliminar, plan, guardarPlan, crearPersonalizado, actualizarPersonalizado,
  eliminarPersonalizado, guardarMetaPeso, eliminarMetaPeso,
};

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
async function racha(req, res) { res.json(await servicio.racha(req.usuario.id)); }
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
// Planes de comidas (SC-44): cada cambio responde la lista completa.
const planesComida = require('../services/planComida.service');
const cuerpoPlan = ({ nombre, tipo, nota, items }) => ({ nombre, tipo, nota, items });
async function listarPlanesComida(req, res) { res.json(await planesComida.listar(req.usuario.id)); }
async function crearPlanComida(req, res) {
  res.status(201).json(await planesComida.crear(req.usuario.id, cuerpoPlan(req.body), { usar: req.body.usar === true }));
}
async function actualizarPlanComida(req, res) { res.json(await planesComida.actualizar(req.usuario.id, req.params.id, cuerpoPlan(req.body))); }
async function eliminarPlanComida(req, res) { res.json(await planesComida.eliminar(req.usuario.id, req.params.id)); }
async function usarPlanComida(req, res) { res.json(await planesComida.usar(req.usuario.id, req.params.id, req.body.enUso)); }
async function registrarPlanComida(req, res) {
  const { fecha, momento, items } = req.body;
  res.status(201).json(await planesComida.registrar(req.usuario.id, req.params.id, { fecha, momento, items }));
}
async function registrarPeso(req, res) {
  const { pesoKg, fecha } = req.body;
  res.status(201).json(await planes.registrarPeso(req.usuario.id, { pesoKg, fecha }));
}
async function eliminarPeso(req, res) { res.json(await planes.eliminarPeso(req.usuario.id, req.params.id)); }

module.exports = {
  alimentos, delDia, semana, estadisticas, racha, agregar, actualizar, eliminar, plan, guardarPlan, crearPersonalizado, actualizarPersonalizado,
  eliminarPersonalizado, guardarMetaPeso, eliminarMetaPeso, registrarPeso, eliminarPeso,
  planesComida: listarPlanesComida, crearPlanComida, actualizarPlanComida, eliminarPlanComida, usarPlanComida, registrarPlanComida,
};

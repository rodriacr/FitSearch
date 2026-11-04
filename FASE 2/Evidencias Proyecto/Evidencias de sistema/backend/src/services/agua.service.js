// Registro de agua (FS-HU-33): el agua de hoy en Chile, frente a una meta diaria general. Se suma desde el Inicio.
const modelo = require('../models/agua.model');
const { fechaEnChile, horaEnChile } = require('../utils/fechaChile');
const { agua: reglas } = require('../../../shared/reglas.json');

function resumen(fecha, registros) {
  return {
    fecha,
    totalMl: registros.reduce((suma, { ml }) => suma + ml, 0),
    metaMl: reglas.metaDiariaMl,
    vasoMl: reglas.vasoMl,
    registros: registros.map(({ id, ml, fechaCreacion }) => ({ id, ml, hora: horaEnChile(fechaCreacion) })),
  };
}

async function hoy(usuarioId, ahora = new Date()) {
  const fecha = fechaEnChile(ahora);
  return resumen(fecha, await modelo.delDia(usuarioId, fecha));
}

async function agregar(usuarioId, ml, ahora = new Date()) {
  const fecha = fechaEnChile(ahora);
  return resumen(fecha, await modelo.agregar(usuarioId, fecha, ml));
}

async function eliminar(usuarioId, id, ahora = new Date()) {
  const fecha = fechaEnChile(ahora);
  return resumen(fecha, await modelo.eliminar(usuarioId, fecha, id));
}

module.exports = { hoy, agregar, eliminar };

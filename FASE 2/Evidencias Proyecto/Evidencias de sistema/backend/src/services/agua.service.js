// Registro de agua (FS-HU-33): el agua de hoy en Chile, frente a una meta diaria general. Se suma desde el Inicio
// («Agua hoy») o desde Comidas, como si fuera un alimento, al día que se está viendo.
const ErrorHttp = require('../utils/ErrorHttp');
const modelo = require('../models/agua.model');
const { fechaEnChile, horaEnChile } = require('../utils/fechaChile');
const { agua: reglas } = require('../../../shared/reglas.json');

function resumen(fecha, registros, ahora) {
  return {
    fecha,
    hoy: fechaEnChile(ahora),
    totalMl: registros.reduce((suma, { ml }) => suma + ml, 0),
    metaMl: reglas.metaDiariaMl,
    vasoMl: reglas.vasoMl,
    registros: registros.map(({ id, ml, fechaCreacion }) => ({ id, ml, hora: horaEnChile(fechaCreacion) })),
  };
}

// Sin fecha es el día de hoy. Comidas envía el día que se está viendo, que no puede ser uno que aún no llega.
function diaPedido(fecha, ahora, mensaje) {
  const dia = fecha ?? fechaEnChile(ahora);
  if (dia > fechaEnChile(ahora)) throw new ErrorHttp(400, mensaje);
  return dia;
}

async function delDia(usuarioId, fecha = null, ahora = new Date()) {
  const dia = diaPedido(fecha, ahora, 'No hay registros de agua en días que aún no llegan');
  return resumen(dia, await modelo.delDia(usuarioId, dia), ahora);
}

async function agregar(usuarioId, ml, fecha = null, ahora = new Date()) {
  const dia = diaPedido(fecha, ahora, 'No puedes registrar agua en días que aún no llegan');
  return resumen(dia, await modelo.agregar(usuarioId, dia, ml), ahora);
}

// Sin fecha, deshace una suma de hoy (Inicio). Comidas envía el día que se está viendo, para quitar un error de un día
// anterior (revisión del PR #48).
async function eliminar(usuarioId, id, fecha = null, ahora = new Date()) {
  const dia = diaPedido(fecha, ahora, 'No hay registros de agua en días que aún no llegan');
  return resumen(dia, await modelo.eliminar(usuarioId, dia, id), ahora);
}

module.exports = { delDia, agregar, eliminar };

// Registro de agua (FS-HU-33): el agua de hoy en Chile, frente a una meta diaria general. Se suma desde el Inicio
// («Agua hoy») o desde Comidas, como si fuera un alimento, al día que se está viendo.
const ErrorHttp = require('../utils/ErrorHttp');
const modelo = require('../models/agua.model');
const { fechaEnChile, horaEnChile, lunesDeLaSemana, sumarDias } = require('../utils/fechaChile');
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

// Agua de cada día de la semana actual, de lunes a domingo, para el resumen semanal del Inicio (25-11-2026). Los días que
// aún no llegan quedan marcados; diasConMeta cuenta los días que llegaron a la meta general.
async function semana(usuarioId, ahora = new Date()) {
  const hoy = fechaEnChile(ahora);
  const desde = lunesDeLaSemana(hoy);
  const hasta = sumarDias(desde, 6);
  const totales = await modelo.totalesPorDia(usuarioId, desde, hasta);
  const porDia = new Map(totales.map(({ fecha, _sum }) => [fecha.toISOString().slice(0, 10), _sum.ml ?? 0]));
  const dias = Array.from({ length: 7 }, (_, i) => {
    const fecha = sumarDias(desde, i);
    return { fecha, totalMl: porDia.get(fecha) ?? 0, futuro: fecha > hoy };
  });
  return {
    desde,
    hasta,
    hoy,
    metaMl: reglas.metaDiariaMl,
    totalMl: dias.reduce((suma, { totalMl }) => suma + totalMl, 0),
    diasConMeta: dias.filter(({ totalMl }) => totalMl >= reglas.metaDiariaMl).length,
    dias,
  };
}

module.exports = { delDia, agregar, eliminar, semana };

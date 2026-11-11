// Clientes (FS-HU-27) y reportes (FS-HU-28) del profesional, calculados desde sus reservas y reseñas.
// Una cita "pasada" es la que ya comenzó en hora de Chile: si estaba confirmada se cuenta como realizada y si seguía
// pendiente, como no confirmada a tiempo. Las personas se muestran solo con su nombre, sin correo ni datos de salud.
const modelo = require('../models/actividadProfesional.model');
const ErrorHttp = require('../utils/ErrorHttp');
const { fechaEnChile, horaEnChile, sumarDias, lunesDeLaSemana } = require('../utils/fechaChile');

const ZONA = 'America/Santiago';

function cita(r, ahora) {
  const horario = {
    fecha: r.disponibilidad.fecha.toISOString().slice(0, 10),
    horaInicio: r.disponibilidad.horaInicio.toISOString().slice(11, 16),
    horaFin: r.disponibilidad.horaFin.toISOString().slice(11, 16),
  };
  return {
    id: r.id,
    estado: r.estado,
    mensaje: r.mensaje,
    fechaCreacion: r.fechaCreacion.toISOString(),
    horario,
    pasada: horario.fecha < ahora.fecha || (horario.fecha === ahora.fecha && horario.horaInicio <= ahora.hora),
  };
}

const ahoraEnChile = (ahora) => ({ fecha: fechaEnChile(ahora), hora: horaEnChile(ahora) });

function contarEstados(citas) {
  const cuenta = { pendientes: 0, confirmadas: 0, realizadas: 0, sinConfirmar: 0, canceladas: 0 };
  for (const c of citas) {
    if (c.estado === 'cancelada') cuenta.canceladas += 1;
    else if (c.estado === 'confirmada') cuenta[c.pasada ? 'realizadas' : 'confirmadas'] += 1;
    else cuenta[c.pasada ? 'sinConfirmar' : 'pendientes'] += 1;
  }
  return cuenta;
}

// Agrupa las reservas por persona. Las filas llegan de la cita más reciente a la más antigua.
function agruparPorCliente(filas, ahora) {
  const clientes = new Map();
  for (const fila of filas) {
    const c = cita(fila, ahora);
    if (!clientes.has(fila.usuario.id)) clientes.set(fila.usuario.id, { id: fila.usuario.id, nombre: fila.usuario.nombre, citas: [] });
    clientes.get(fila.usuario.id).citas.push(c);
  }
  return [...clientes.values()];
}

function resumenCliente({ id, nombre, citas }) {
  const activas = citas.filter((c) => c.estado !== 'cancelada');
  const proximas = activas.filter((c) => !c.pasada);
  const anteriores = activas.filter((c) => c.pasada);
  return {
    id,
    nombre,
    totalCitas: citas.length,
    estados: contarEstados(citas),
    // La próxima es la más cercana en el futuro; la última, la más reciente que ya ocurrió.
    proximaCita: proximas.length ? proximas[proximas.length - 1].horario : null,
    ultimaCita: anteriores.length ? anteriores[0].horario : null,
    primeraReserva: citas.reduce((primera, c) => (c.fechaCreacion < primera ? c.fechaCreacion : primera), citas[0].fechaCreacion),
  };
}

// Lista de clientes: primero quienes tienen una cita próxima (la más cercana arriba) y luego el resto por su última cita.
async function listarClientes(usuarioId, ahora = new Date()) {
  const { id: profesionalId } = await modelo.fichaDe(usuarioId);
  const clientes = agruparPorCliente(await modelo.reservas(profesionalId), ahoraEnChile(ahora)).map(resumenCliente);
  clientes.sort((a, b) => compararClientes(a, b) || a.nombre.localeCompare(b.nombre, 'es'));
  return { clientes, zonaHoraria: ZONA };
}

const texto = (horario) => (horario ? `${horario.fecha}T${horario.horaInicio}` : '');
function compararClientes(a, b) {
  if (a.proximaCita && b.proximaCita) return texto(a.proximaCita).localeCompare(texto(b.proximaCita));
  if (a.proximaCita || b.proximaCita) return a.proximaCita ? -1 : 1;
  return texto(b.ultimaCita).localeCompare(texto(a.ultimaCita));
}

// Historial de una persona con este profesional. Si nunca reservó con él, responde 404 (no revela si la cuenta existe).
async function historialCliente(usuarioId, clienteId, ahora = new Date()) {
  const { id: profesionalId } = await modelo.fichaDe(usuarioId);
  const filas = await modelo.reservas(profesionalId, clienteId);
  if (!filas.length) throw new ErrorHttp(404, 'No encontramos a esta persona entre tus clientes');
  const [cliente] = agruparPorCliente(filas, ahoraEnChile(ahora));
  return { cliente: resumenCliente(cliente), citas: cliente.citas, zonaHoraria: ZONA };
}

const fechaCreacionEnChile = (c) => fechaEnChile(new Date(c.fechaCreacion));

// Reportes: reservas por semana (por la fecha de la cita, de lunes a domingo) y por estado, calificación promedio y el
// resumen de la semana en curso que muestra el Inicio del profesional.
async function reportes(usuarioId, { semanas = 8 } = {}, ahora = new Date()) {
  const { id: profesionalId } = await modelo.fichaDe(usuarioId);
  const momento = ahoraEnChile(ahora);
  const [filas, calificacion] = await Promise.all([modelo.reservas(profesionalId), modelo.calificacion(profesionalId)]);
  const citas = filas.map((fila) => ({ ...cita(fila, momento), clienteId: fila.usuario.id }));

  const lunesActual = lunesDeLaSemana(momento.fecha);
  const porSemana = Array.from({ length: semanas }, (_, i) => {
    const inicio = sumarDias(lunesActual, (i - semanas + 1) * 7);
    const fin = sumarDias(inicio, 6);
    const enSemana = citas.filter((c) => c.horario.fecha >= inicio && c.horario.fecha <= fin);
    return { inicio, fin, total: enSemana.length, ...contarEstados(enSemana) };
  });

  const finActual = sumarDias(lunesActual, 6);
  const primeraPorCliente = new Map();
  for (const c of citas) {
    const fecha = fechaCreacionEnChile(c);
    if (!primeraPorCliente.has(c.clienteId) || fecha < primeraPorCliente.get(c.clienteId)) primeraPorCliente.set(c.clienteId, fecha);
  }
  const resumenSemanal = {
    inicio: lunesActual,
    fin: finActual,
    totalClientes: primeraPorCliente.size,
    citasRealizadas: citas.filter((c) => c.estado === 'confirmada' && c.pasada && c.horario.fecha >= lunesActual).length,
    citasPendientes: citas.filter((c) => c.estado === 'pendiente' && !c.pasada).length,
    clientesNuevos: [...primeraPorCliente.values()].filter((fecha) => fecha >= lunesActual && fecha <= finActual).length,
  };

  return {
    semanas: porSemana,
    totales: { total: citas.length, ...contarEstados(citas) },
    calificacion: {
      promedio: calificacion.promedio === null ? null : Math.round(Number(calificacion.promedio) * 10) / 10,
      cantidad: calificacion.cantidad,
    },
    resumenSemanal,
    zonaHoraria: ZONA,
  };
}

module.exports = { listarClientes, historialCliente, reportes, contarEstados };

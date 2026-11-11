// Clientes (FS-HU-27) y reportes (FS-HU-28) del espacio del profesional. Salen de sus reservas y reseñas: nunca muestran
// la información de salud (FS-HU-19) ni el correo de sus clientes.
const prisma = require('../models/prisma');
const ErrorHttp = require('../utils/ErrorHttp');
const { fechaEnChile, horaEnChile, sumarDias, lunesDeLaSemana } = require('../utils/fechaChile');

const dia = (fecha) => fecha.toISOString().slice(0, 10);
const hora = (valor) => valor.toISOString().slice(11, 16);
const ESTADOS = ['pendiente', 'confirmada', 'cancelada'];

async function fichaDe(usuarioId) {
  const ficha = await prisma.profesional.findUnique({ where: { usuarioId }, select: { id: true } });
  if (!ficha) throw new ErrorHttp(409, 'Completa tu ficha profesional antes de continuar');
  return ficha;
}

function reservasDe(profesionalId, where = {}) {
  return prisma.reserva.findMany({
    // Se conserva lo que pida la consulta sobre el horario (por ejemplo, un rango de fechas) y se agrega el profesional.
    where: { ...where, disponibilidad: { ...where.disponibilidad, profesionalId } },
    select: {
      id: true, estado: true, mensaje: true, modalidad: true, primeraVisita: true, canceladaPor: true, fechaCreacion: true,
      usuario: { select: { id: true, nombre: true } },
      disponibilidad: { select: { fecha: true, horaInicio: true, horaFin: true } },
    },
    orderBy: [{ disponibilidad: { fecha: 'desc' } }, { disponibilidad: { horaInicio: 'desc' } }, { id: 'desc' }],
  });
}

const cita = (r) => ({
  reservaId: r.id,
  fecha: dia(r.disponibilidad.fecha),
  horaInicio: hora(r.disponibilidad.horaInicio),
  horaFin: hora(r.disponibilidad.horaFin),
  estado: r.estado,
});
const momento = (c) => `${c.fecha}T${c.horaInicio}`;

// FS-HU-27: cada persona que reservó, con su última cita, la próxima y cuántas citas tiene.
async function clientes(usuarioId, ahora = new Date()) {
  const { id } = await fichaDe(usuarioId);
  const reservas = await reservasDe(id);
  const ya = `${fechaEnChile(ahora)}T${horaEnChile(ahora)}`;
  const porCliente = new Map();
  for (const r of reservas) {
    const actual = porCliente.get(r.usuario.id) || { id: r.usuario.id, nombre: r.usuario.nombre, citas: [] };
    actual.citas.push(cita(r));
    porCliente.set(r.usuario.id, actual);
  }
  const lista = [...porCliente.values()].map(({ citas, ...cliente }) => {
    const vigentes = citas.filter((c) => c.estado !== 'cancelada');
    const pasadas = vigentes.filter((c) => momento(c) <= ya);
    const proximas = vigentes.filter((c) => momento(c) > ya).sort((a, b) => momento(a).localeCompare(momento(b)));
    return {
      ...cliente,
      totalCitas: citas.length,
      citasRealizadas: pasadas.filter((c) => c.estado === 'confirmada').length,
      canceladas: citas.length - vigentes.length,
      ultimaCita: pasadas[0] || null,
      proximaCita: proximas[0] || null,
      // Fecha de su primera reserva contigo (las citas vienen de la más reciente a la más antigua).
      clienteDesde: citas.at(-1).fecha,
    };
  });
  // Primero quienes tienen una cita próxima (la más cercana arriba) y luego por su última cita.
  lista.sort((a, b) => {
    if (a.proximaCita && b.proximaCita) return momento(a.proximaCita).localeCompare(momento(b.proximaCita));
    if (a.proximaCita || b.proximaCita) return a.proximaCita ? -1 : 1;
    return (b.ultimaCita ? momento(b.ultimaCita) : '').localeCompare(a.ultimaCita ? momento(a.ultimaCita) : '') || a.nombre.localeCompare(b.nombre);
  });
  return { clientes: lista, total: lista.length };
}

// FS-HU-27: historial de un cliente con este profesional, de la cita más reciente a la más antigua.
async function historial(usuarioId, clienteId) {
  const { id } = await fichaDe(usuarioId);
  const reservas = await reservasDe(id, { usuarioId: clienteId });
  if (!reservas.length) throw new ErrorHttp(404, 'No encontramos a este cliente');
  return {
    cliente: { id: reservas[0].usuario.id, nombre: reservas[0].usuario.nombre },
    citas: reservas.map((r) => ({
      ...cita(r),
      mensaje: r.mensaje,
      modalidad: r.modalidad ?? null,
      primeraVisita: r.primeraVisita ?? null,
      canceladaPor: r.canceladaPor ?? null,
    })),
  };
}

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const diaSemana = (fecha) => (new Date(`${fecha}T00:00:00Z`).getUTCDay() + 6) % 7;
const franja = (horaInicio) => (horaInicio < '12:00' ? 'manana' : horaInicio < '18:00' ? 'tarde' : 'noche');
const porcentaje = (parte, total) => (total ? Math.round((parte / total) * 100) : null);

// Resumen de un grupo de reservas (sin las canceladas en "atendidas").
function contar(reservas, desde) {
  const clientes = new Set(reservas.map((r) => r.usuario.id));
  return {
    reservas: reservas.length,
    confirmadas: reservas.filter((r) => r.estado === 'confirmada').length,
    pendientes: reservas.filter((r) => r.estado === 'pendiente').length,
    canceladas: reservas.filter((r) => r.estado === 'cancelada').length,
    clientes: clientes.size,
    clientesNuevos: [...clientes].filter((clienteId) => !desde.has(clienteId)).length,
  };
}

// FS-HU-28: reservas por semana y por estado, calificación y cantidad de reseñas, demanda por día y franja, y la
// comparación con el período anterior. La semana va de lunes a domingo (hora de Chile) y cuenta por la fecha de la cita.
async function reportes(usuarioId, semanas = 8, ahora = new Date()) {
  const { id } = await fichaDe(usuarioId);
  const hoy = fechaEnChile(ahora);
  const lunesActual = lunesDeLaSemana(hoy);
  const inicio = sumarDias(lunesActual, -7 * (semanas - 1));
  const anteriorInicio = sumarDias(inicio, -7 * semanas);
  const fin = sumarDias(lunesActual, 6);
  const [reservas, resenas, publicados] = await Promise.all([
    reservasDe(id, { disponibilidad: { fecha: { gte: new Date(`${anteriorInicio}T00:00:00Z`), lte: new Date(`${fin}T00:00:00Z`) } } }),
    prisma.resena.findMany({ where: { profesionalId: id }, select: { puntaje: true, reservaId: true, fechaCreacion: true } }),
    prisma.disponibilidad.findMany({
      where: { profesionalId: id, fecha: { gte: new Date(`${inicio}T00:00:00Z`), lte: new Date(`${fin}T00:00:00Z`) } },
      select: { id: true, retirado: true, reservas: { where: { estado: { in: ['pendiente', 'confirmada'] } }, select: { id: true } } },
    }),
  ]);
  // Clientes que ya habían reservado antes del período (para contar a los nuevos).
  const antes = await prisma.reserva.findMany({
    where: { disponibilidad: { profesionalId: id, fecha: { lt: new Date(`${inicio}T00:00:00Z`) } } },
    select: { usuarioId: true }, distinct: ['usuarioId'],
  });
  const conocidos = new Set(antes.map((r) => r.usuarioId));
  // Cada período con sus dos límites: lo posterior a esta semana y lo anterior al período de comparación no cuentan.
  const entre = (desde, hasta) => (r) => dia(r.disponibilidad.fecha) >= desde && dia(r.disponibilidad.fecha) <= hasta;
  const delPeriodo = reservas.filter(entre(inicio, fin));
  const anterior = reservas.filter(entre(anteriorInicio, sumarDias(inicio, -1)));

  const porSemana = Array.from({ length: semanas }, (_, indice) => {
    const desde = sumarDias(inicio, 7 * indice);
    const hasta = sumarDias(desde, 6);
    const deLaSemana = delPeriodo.filter((r) => dia(r.disponibilidad.fecha) >= desde && dia(r.disponibilidad.fecha) <= hasta);
    return { desde, hasta, actual: desde === lunesActual, ...Object.fromEntries(ESTADOS.map((e) => [e, deLaSemana.filter((r) => r.estado === e).length])) };
  });

  const atendidas = delPeriodo.filter((r) => r.estado !== 'cancelada');
  const demandaDia = DIAS.map((nombre, indice) => ({ dia: nombre, reservas: atendidas.filter((r) => diaSemana(dia(r.disponibilidad.fecha)) === indice).length }));
  const demandaFranja = ['manana', 'tarde', 'noche'].map((clave) => ({ franja: clave, reservas: atendidas.filter((r) => franja(hora(r.disponibilidad.horaInicio)) === clave).length }));
  // Reservas pedidas fuera del horario laboral (antes de las 9:00, desde las 19:00 o en fin de semana, hora de Chile):
  // las que llegan cuando la consulta está cerrada.
  const fueraDeHorario = delPeriodo.filter((r) => {
    const fecha = fechaEnChile(r.fechaCreacion);
    const h = horaEnChile(r.fechaCreacion);
    return diaSemana(fecha) >= 5 || h < '09:00' || h >= '19:00';
  }).length;

  const actual = contar(delPeriodo, conocidos);
  const previo = contar(anterior, new Set());
  const ofrecidos = publicados.filter((b) => !b.retirado || b.reservas.length);
  const puntajes = resenas.map((r) => r.puntaje);
  const deEstaSemana = delPeriodo.filter((r) => dia(r.disponibilidad.fecha) >= lunesActual);
  return {
    periodo: { desde: inicio, hasta: fin, semanas, hoy },
    totales: {
      ...actual,
      tasaCancelacion: porcentaje(actual.canceladas, actual.reservas),
      ocupacion: porcentaje(ofrecidos.filter((b) => b.reservas.length).length, ofrecidos.length),
      horariosPublicados: ofrecidos.length,
      fueraDeHorario,
    },
    anterior: { desde: anteriorInicio, hasta: sumarDias(inicio, -1), ...previo },
    porSemana,
    demandaDia,
    demandaFranja,
    calificacion: {
      promedio: puntajes.length ? Math.round((puntajes.reduce((a, b) => a + b, 0) / puntajes.length) * 10) / 10 : null,
      total: puntajes.length,
      verificadas: resenas.filter((r) => r.reservaId).length,
      distribucion: Object.fromEntries([5, 4, 3, 2, 1].map((p) => [p, puntajes.filter((x) => x === p).length])),
    },
    // FS-HU-28, criterio 2: el Inicio del profesional muestra esta semana.
    semanaActual: { desde: lunesActual, hasta: fin, ...contar(deEstaSemana, new Set([...conocidos, ...delPeriodo.filter((r) => dia(r.disponibilidad.fecha) < lunesActual).map((r) => r.usuario.id)])) },
  };
}

module.exports = { clientes, historial, reportes };

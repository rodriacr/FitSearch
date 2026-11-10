// Datos de la actividad del profesional: sus clientes (FS-HU-27) y sus reportes (FS-HU-28).
// Solo se leen las reservas y reseñas del propio profesional; nunca la información de salud de las personas.
const prisma = require('./prisma');
const ErrorHttp = require('../utils/ErrorHttp');

async function fichaDe(usuarioId) {
  const ficha = await prisma.profesional.findUnique({ where: { usuarioId }, select: { id: true } });
  if (!ficha) throw new ErrorHttp(409, 'Completa tu ficha profesional para ver tus clientes y reportes');
  return ficha;
}

// Todas las reservas recibidas, con el nombre de quien reservó y el horario de la cita.
function reservas(profesionalId, usuarioId) {
  return prisma.reserva.findMany({
    where: { disponibilidad: { profesionalId }, ...(usuarioId && { usuarioId }) },
    select: {
      id: true, estado: true, mensaje: true, fechaCreacion: true,
      usuario: { select: { id: true, nombre: true } },
      disponibilidad: { select: { fecha: true, horaInicio: true, horaFin: true } },
    },
    orderBy: [{ disponibilidad: { fecha: 'desc' } }, { disponibilidad: { horaInicio: 'desc' } }, { id: 'desc' }],
  });
}

// Calificación promedio y cantidad de reseñas (FS-HU-24).
async function calificacion(profesionalId) {
  const { _avg: promedio, _count: cantidad } = await prisma.resena.aggregate({
    where: { profesionalId }, _avg: { puntaje: true }, _count: { _all: true },
  });
  return { promedio: promedio.puntaje, cantidad: cantidad._all };
}

module.exports = { fichaDe, reservas, calificacion };

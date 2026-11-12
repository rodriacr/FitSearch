// Acceso a datos de la tabla resenas (FS-HU-24).
const prisma = require('./prisma');

const seleccion = {
  id: true, usuarioId: true, puntaje: true, comentario: true, reservaId: true, fechaCreacion: true, fechaActualizacion: true,
  usuario: { select: { nombre: true } },
};

// Filtro de la ficha (09-11-2026): positivas (4 y 5 estrellas) o negativas (1 y 2).
const TIPOS = { positivas: { gte: 4 }, negativas: { lte: 2 } };

async function listar(profesionalId, { pagina, limite, tipo }) {
  const where = { profesionalId, ...(TIPOS[tipo] && { puntaje: TIPOS[tipo] }) };
  const [filas, total] = await Promise.all([
    prisma.resena.findMany({
      where, select: seleccion,
      orderBy: [{ fechaActualizacion: 'desc' }, { id: 'desc' }], skip: (pagina - 1) * limite, take: limite,
    }),
    prisma.resena.count({ where }),
  ]);
  return { filas, total };
}

// Cantidad de reseñas por puntaje, para el resumen de la ficha.
async function distribucion(profesionalId) {
  const grupos = await prisma.resena.groupBy({ by: ['puntaje'], where: { profesionalId }, _count: { _all: true } });
  return grupos.map((grupo) => ({ puntaje: grupo.puntaje, cantidad: grupo._count._all }));
}

function buscarDelUsuario(usuarioId, profesionalId) {
  return prisma.resena.findUnique({ where: { usuarioId_profesionalId: { usuarioId, profesionalId } }, select: seleccion });
}

// Cita que respalda una reseña (09-11-2026): la reserva confirmada más reciente del usuario con el profesional cuya hora
// ya comenzó (hora de Chile). Sin ella, el usuario no puede publicar una reseña nueva.
async function citaVerificable(usuarioId, profesionalId, { fecha, hora }) {
  const citas = await prisma.reserva.findMany({
    where: { usuarioId, estado: 'confirmada', disponibilidad: { profesionalId, fecha: { lte: new Date(`${fecha}T00:00:00Z`) } } },
    select: { id: true, disponibilidad: { select: { fecha: true, horaInicio: true } } },
    orderBy: [{ disponibilidad: { fecha: 'desc' } }, { disponibilidad: { horaInicio: 'desc' } }],
    take: 5,
  });
  return citas.find(({ disponibilidad: d }) => `${d.fecha.toISOString().slice(0, 10)}T${d.horaInicio.toISOString().slice(11, 16)}` <= `${fecha}T${hora}`) || null;
}

// Una reseña por usuario y profesional: si ya existe, se reemplaza por la nueva calificación. La cita que la respalda se
// guarda al crearla o, si la reseña era anterior al 09-11-2026, cuando el usuario la edita después de una cita.
async function guardar(usuarioId, profesionalId, { puntaje, comentario, reservaId = null }) {
  const existente = await prisma.resena.findUnique({ where: { usuarioId_profesionalId: { usuarioId, profesionalId } }, select: { id: true } });
  const fila = await prisma.resena.upsert({
    where: { usuarioId_profesionalId: { usuarioId, profesionalId } },
    create: { usuarioId, profesionalId, puntaje, comentario, reservaId },
    update: { puntaje, comentario, ...(reservaId && { reservaId }) },
    select: seleccion,
  });
  return { fila, creada: !existente };
}

function eliminar(usuarioId, profesionalId) {
  return prisma.resena.deleteMany({ where: { usuarioId, profesionalId } });
}

module.exports = { listar, distribucion, buscarDelUsuario, citaVerificable, guardar, eliminar };

// Acceso a datos de la tabla resenas (FS-HU-24).
const prisma = require('./prisma');

const seleccion = {
  id: true, usuarioId: true, puntaje: true, comentario: true, fechaCreacion: true, fechaActualizacion: true,
  usuario: { select: { nombre: true } },
};

async function listar(profesionalId, { pagina, limite }) {
  const [filas, total] = await Promise.all([
    prisma.resena.findMany({
      where: { profesionalId }, select: seleccion,
      orderBy: [{ fechaActualizacion: 'desc' }, { id: 'desc' }], skip: (pagina - 1) * limite, take: limite,
    }),
    prisma.resena.count({ where: { profesionalId } }),
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

// Una reseña por usuario y profesional: si ya existe, se reemplaza por la nueva calificación.
async function guardar(usuarioId, profesionalId, { puntaje, comentario }) {
  const existente = await prisma.resena.findUnique({ where: { usuarioId_profesionalId: { usuarioId, profesionalId } }, select: { id: true } });
  const fila = await prisma.resena.upsert({
    where: { usuarioId_profesionalId: { usuarioId, profesionalId } },
    create: { usuarioId, profesionalId, puntaje, comentario },
    update: { puntaje, comentario },
    select: seleccion,
  });
  return { fila, creada: !existente };
}

function eliminar(usuarioId, profesionalId) {
  return prisma.resena.deleteMany({ where: { usuarioId, profesionalId } });
}

module.exports = { listar, distribucion, buscarDelUsuario, guardar, eliminar };

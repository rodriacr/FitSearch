const prisma = require('./prisma');

// Solo datos de la ficha pública. Nunca incluir correo de acceso, contraseña ni salud.
const seleccion = {
  id: true, especialidad: true, descripcion: true, ubicacionLat: true, ubicacionLng: true,
  usuario: { select: { nombre: true } },
  establecimiento: { select: { nombre: true, direccion: true } },
};

async function listar({ especialidad, comuna, pagina, limite }) {
  return prisma.profesional.findMany({
    where: {
      usuario: { rol: { nombre: 'profesional' } },
      ...(especialidad ? { especialidad: { equals: especialidad } } : {}),
      ...(comuna ? { establecimiento: { is: { direccion: { contains: comuna } } } } : {}),
    },
    select: seleccion, orderBy: { id: 'asc' }, skip: (pagina - 1) * limite, take: limite + 1,
  });
}

async function especialidades() {
  const filas = await prisma.profesional.findMany({
    where: { usuario: { rol: { nombre: 'profesional' } } },
    select: { especialidad: true }, distinct: ['especialidad'], orderBy: { especialidad: 'asc' },
  });
  return filas.map((fila) => fila.especialidad);
}

const seleccionFicha = { especialidad: true, descripcion: true, ubicacionLat: true, ubicacionLng: true };

// Ficha del propio profesional (null si todavía no la completa).
function obtenerPorUsuario(usuarioId) {
  return prisma.profesional.findUnique({ where: { usuarioId }, select: seleccionFicha });
}

// Crea o actualiza la ficha: un usuario tiene como máximo una (usuario_id es único).
function guardarFicha(usuarioId, datos) {
  return prisma.profesional.upsert({
    where: { usuarioId }, update: datos, create: { usuarioId, ...datos }, select: seleccionFicha,
  });
}

module.exports = { listar, especialidades, obtenerPorUsuario, guardarFicha };

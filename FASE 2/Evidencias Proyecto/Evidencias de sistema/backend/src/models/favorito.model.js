// Acceso a datos de la tabla favoritos (FS-HU-23).
const prisma = require('./prisma');

// Agregar dos veces el mismo favorito no falla ni lo duplica (índice único usuario-profesional).
function agregar(usuarioId, profesionalId) {
  return prisma.favorito.upsert({
    where: { usuarioId_profesionalId: { usuarioId, profesionalId } },
    create: { usuarioId, profesionalId },
    update: {},
  });
}

function quitar(usuarioId, profesionalId) {
  return prisma.favorito.deleteMany({ where: { usuarioId, profesionalId } });
}

module.exports = { agregar, quitar };

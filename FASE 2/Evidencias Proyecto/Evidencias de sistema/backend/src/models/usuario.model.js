// Acceso a datos de la tabla usuarios.
const prisma = require('./prisma');

function buscarPorCorreo(correo) {
  return prisma.usuario.findUnique({ where: { correo }, include: { rol: true } });
}

function buscarPorIdConPerfil(id) {
  return prisma.usuario.findUnique({ where: { id }, include: { rol: true, perfil: true } });
}

// Crea el usuario y su registro vacío en perfiles_usuario en una sola operación atómica (relación 1 : 1).
function crearConPerfil({ nombre, correo, passwordHash, rolNombre }) {
  return prisma.usuario.create({
    data: {
      nombre,
      correo,
      passwordHash,
      rol: { connect: { nombre: rolNombre } },
      perfil: { create: {} },
    },
    include: { rol: true },
  });
}

module.exports = { buscarPorCorreo, buscarPorIdConPerfil, crearConPerfil };

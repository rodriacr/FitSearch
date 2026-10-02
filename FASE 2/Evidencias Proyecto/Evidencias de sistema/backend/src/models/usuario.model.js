// Acceso a datos de la tabla usuarios.
const prisma = require('./prisma');

function buscarPorCorreo(correo) {
  return prisma.usuario.findUnique({ where: { correo }, include: { rol: true } });
}

function buscarPorGoogleId(googleId) {
  return prisma.usuario.findUnique({ where: { googleId }, include: { rol: true } });
}

// Asocia una cuenta ya existente con la cuenta de Google del mismo correo (FS-HU-16).
function vincularGoogle(id, googleId) {
  return prisma.usuario.update({ where: { id }, data: { googleId }, include: { rol: true } });
}

// Confirma el tipo de cuenta que la persona eligió en el asistente de perfil (FS-HU-02).
function confirmarRol(id, rolNombre) {
  return prisma.usuario.update({
    where: { id },
    data: { rol: { connect: { nombre: rolNombre } }, rolConfirmado: true },
    include: { rol: true },
  });
}

function buscarPorIdConPerfil(id) {
  return prisma.usuario.findUnique({ where: { id }, include: { rol: true, perfil: true, informacionSalud: true } });
}

// Crea el usuario y su registro vacío en perfiles_usuario en una sola operación atómica (relación 1 : 1).
// Las cuentas creadas con Google no tienen contraseña (passwordHash queda nulo) y llegan con su googleId.
function crearConPerfil({ nombre, correo, passwordHash = null, googleId = null, rolNombre }) {
  return prisma.usuario.create({
    data: {
      nombre,
      correo,
      passwordHash,
      googleId,
      rol: { connect: { nombre: rolNombre } },
      perfil: { create: {} },
    },
    include: { rol: true },
  });
}

module.exports = { buscarPorCorreo, buscarPorGoogleId, vincularGoogle, confirmarRol, buscarPorIdConPerfil, crearConPerfil };

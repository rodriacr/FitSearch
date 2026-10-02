// Acceso a datos de la tabla tokens_recuperacion.
const prisma = require('./prisma');

// Invalida los códigos pendientes del usuario y crea uno nuevo en una sola transacción: solo el último enlace sirve.
function reemplazarPorUsuario({ usuarioId, tokenHash, fechaExpiracion }) {
  return prisma.$transaction([
    prisma.tokenRecuperacion.updateMany({ where: { usuarioId, fechaUso: null }, data: { fechaUso: new Date() } }),
    prisma.tokenRecuperacion.create({ data: { usuarioId, tokenHash, fechaExpiracion } }),
  ]);
}

function buscarPorHash(tokenHash) {
  return prisma.tokenRecuperacion.findUnique({ where: { tokenHash } });
}

// Marca el código como usado solo si sigue disponible (evita que dos peticiones simultáneas lo usen) y cambia la contraseña.
function usarYCambiarPassword({ id, usuarioId, passwordHash }) {
  return prisma.$transaction(async (tx) => {
    const { count } = await tx.tokenRecuperacion.updateMany({
      where: { id, fechaUso: null, fechaExpiracion: { gt: new Date() } },
      data: { fechaUso: new Date() },
    });
    if (count === 0) return false;
    await tx.usuario.update({ where: { id: usuarioId }, data: { passwordHash } });
    return true;
  });
}

module.exports = { reemplazarPorUsuario, buscarPorHash, usarYCambiarPassword };

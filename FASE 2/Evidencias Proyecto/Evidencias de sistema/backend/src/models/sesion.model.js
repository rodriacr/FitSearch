const prisma = require('./prisma');
function estadoCuenta(id) {
  return prisma.usuario.findUnique({ where: { id }, select: { activo: true, versionSesion: true } });
}
module.exports = { estadoCuenta };

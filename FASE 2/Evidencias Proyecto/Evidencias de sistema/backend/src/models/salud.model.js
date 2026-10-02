// Acceso a datos de la tabla informacion_salud (relación 1 : 1 con usuarios).
const prisma = require('./prisma');

function guardar(usuarioId, datos) {
  return prisma.informacionSalud.upsert({
    where: { usuarioId },
    create: { usuarioId, ...datos },
    update: datos,
  });
}

module.exports = { guardar };

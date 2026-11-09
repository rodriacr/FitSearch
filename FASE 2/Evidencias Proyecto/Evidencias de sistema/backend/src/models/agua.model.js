// Registro de agua (FS-HU-33). Cada suma es una fila de registro_agua; el total del día es la suma de sus filas.
const prisma = require('./prisma');
const ErrorHttp = require('../utils/ErrorHttp');
const { agua: reglas } = require('../../../shared/reglas.json');

const dia = (fecha) => new Date(`${fecha}T00:00:00Z`);
const SELECCION = { id: true, ml: true, fechaCreacion: true };

function delDia(usuarioId, fecha, db = prisma) {
  return db.registroAgua.findMany({
    where: { usuarioId, fecha: dia(fecha) },
    select: SELECCION,
    orderBy: [{ fechaCreacion: 'asc' }, { id: 'asc' }],
  });
}

// El tope diario evita totales imposibles (por ejemplo, un número escrito de más). Revisión del PR #48: dos sumas
// simultáneas pasaban el tope (9.500 + 500 + 500 = 10.500 ml) porque cada una veía el total sin la otra. Ahora la suma
// bloquea la fila de la cuenta (FOR UPDATE) antes de contar, así las sumas de una misma persona van de a una, y el
// total se lee con una lectura bloqueante, que ve lo último confirmado.
async function agregar(usuarioId, fecha, ml) {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM usuarios WHERE id = ${usuarioId} FOR UPDATE`;
    const [{ total: sumado }] = await tx.$queryRaw`SELECT COALESCE(SUM(ml), 0) AS total FROM registro_agua WHERE usuario_id = ${usuarioId} AND fecha = ${fecha} FOR SHARE`;
    const total = Number(sumado);
    if (total + ml > reglas.maxDiaMl) {
      const quedan = reglas.maxDiaMl - total;
      throw new ErrorHttp(400, `Hoy puedes sumar hasta ${quedan.toLocaleString('es-CL')} ml más (el máximo es ${reglas.maxDiaMl.toLocaleString('es-CL')} ml al día)`,
        { ml: 'Supera el máximo del día' });
    }
    await tx.registroAgua.create({ data: { usuarioId, fecha: dia(fecha), ml } });
    return delDia(usuarioId, fecha, tx);
  });
}

// Solo se deshace una suma propia del día indicado (hoy, o el día que se ve en Comidas): las de otra cuenta o de otro
// día responden 404.
async function eliminar(usuarioId, fecha, id) {
  const { count } = await prisma.registroAgua.deleteMany({ where: { id, usuarioId, fecha: dia(fecha) } });
  if (count === 0) throw new ErrorHttp(404, 'No encontramos ese registro de agua');
  return delDia(usuarioId, fecha);
}

module.exports = { delDia, agregar, eliminar };

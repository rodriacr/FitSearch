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

// El tope diario evita totales imposibles (por ejemplo, un número escrito de más). Se revisa en la misma transacción
// que guarda la suma.
async function agregar(usuarioId, fecha, ml) {
  return prisma.$transaction(async (tx) => {
    const { _sum } = await tx.registroAgua.aggregate({ where: { usuarioId, fecha: dia(fecha) }, _sum: { ml: true } });
    const total = _sum.ml ?? 0;
    if (total + ml > reglas.maxDiaMl) {
      const quedan = reglas.maxDiaMl - total;
      throw new ErrorHttp(400, `Hoy puedes sumar hasta ${quedan.toLocaleString('es-CL')} ml más (el máximo es ${reglas.maxDiaMl.toLocaleString('es-CL')} ml al día)`,
        { ml: 'Supera el máximo del día' });
    }
    await tx.registroAgua.create({ data: { usuarioId, fecha: dia(fecha), ml } });
    return delDia(usuarioId, fecha, tx);
  });
}

// Solo se deshace una suma propia del día indicado (el de hoy): las de otra cuenta o de otro día responden 404.
async function eliminar(usuarioId, fecha, id) {
  const { count } = await prisma.registroAgua.deleteMany({ where: { id, usuarioId, fecha: dia(fecha) } });
  if (count === 0) throw new ErrorHttp(404, 'No encontramos ese registro de agua');
  return delDia(usuarioId, fecha);
}

module.exports = { delDia, agregar, eliminar };

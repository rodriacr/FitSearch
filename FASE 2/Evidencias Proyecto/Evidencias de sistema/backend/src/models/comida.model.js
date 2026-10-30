// Acceso a datos del gestor de alimentación (FS-HU-09 y FS-HU-10): catálogo de alimentos y comidas registradas. Toda
// consulta de registros filtra por el dueño: un registro ajeno se comporta como inexistente.
const prisma = require('./prisma');

const ALIMENTO = { id: true, nombre: true, sinonimos: true, calorias: true, proteinasG: true, carbohidratosG: true, grasasG: true };
const REGISTRO = {
  id: true, fecha: true, momento: true, alimentoId: true, descripcionAlimento: true, gramos: true,
  calorias: true, proteinasG: true, carbohidratosG: true, grasasG: true, origen: true, fechaCreacion: true,
};
const comoDia = (fecha) => new Date(`${fecha}T00:00:00Z`);

// Cada palabra debe aparecer en el nombre o en los sinónimos. La intercalación utf8mb4_unicode_ci de MySQL ignora
// mayúsculas y tildes: «platano» encuentra «Plátano».
function buscarAlimentos(palabras, limite) {
  return prisma.alimento.findMany({
    where: { AND: palabras.map((palabra) => ({ OR: [{ nombre: { contains: palabra } }, { sinonimos: { contains: palabra } }] })) },
    orderBy: { nombre: 'asc' },
    take: limite,
    select: ALIMENTO,
  });
}

const obtenerAlimento = (id) => prisma.alimento.findUnique({ where: { id }, select: ALIMENTO });

function delDia(usuarioId, fecha) {
  return prisma.registroComida.findMany({
    where: { usuarioId, fecha: comoDia(fecha) },
    orderBy: [{ fechaCreacion: 'asc' }, { id: 'asc' }],
    select: REGISTRO,
  });
}

// Calorías de cada día entre dos fechas, para el progreso semanal.
function caloriasPorDia(usuarioId, desde, hasta) {
  return prisma.registroComida.groupBy({
    by: ['fecha'],
    where: { usuarioId, fecha: { gte: comoDia(desde), lte: comoDia(hasta) } },
    _sum: { calorias: true },
  });
}

// `db` es la transacción en curso, si la hay (alimentos agregados desde el chat).
const crear = ({ fecha, ...datos }, db = prisma) => db.registroComida.create({ data: { ...datos, fecha: comoDia(fecha) }, select: REGISTRO });
const obtener = (id, usuarioId) => prisma.registroComida.findFirst({ where: { id, usuarioId }, select: REGISTRO });
const actualizar = (id, datos) => prisma.registroComida.update({ where: { id }, data: datos, select: REGISTRO });
const eliminar = (id, usuarioId) => prisma.registroComida.deleteMany({ where: { id, usuarioId } });

module.exports = { buscarAlimentos, obtenerAlimento, delDia, caloriasPorDia, crear, obtener, actualizar, eliminar };

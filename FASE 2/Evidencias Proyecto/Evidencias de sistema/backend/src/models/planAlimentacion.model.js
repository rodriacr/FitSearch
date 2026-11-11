// Plan de alimentación (11-11-2026).
// - planes_alimentacion: cada cambio es una fila que rige desde su día. El plan de una fecha es el último guardado ese
//   día o antes; sin filas, el plan es el de la meta del perfil.
// - planes_personalizados: la lista de repartos propios de cada usuario.
// - metas_peso: el peso al que quiere llegar y a qué ritmo (una por usuario).
const prisma = require('./prisma');

const dia = (fecha) => new Date(`${fecha}T00:00:00Z`);
const SELECCION = { tipo: true, desde: true, planPersonalizadoId: true, proteinasPct: true, carbohidratosPct: true, grasasPct: true };
const SELECCION_PERSONALIZADO = { id: true, nombre: true, proteinasPct: true, carbohidratosPct: true, grasasPct: true, fechaCreacion: true };

function vigente(usuarioId, fecha) {
  return prisma.planAlimentacion.findFirst({
    where: { usuarioId, desde: { lte: dia(fecha) } },
    select: SELECCION,
    orderBy: { desde: 'desc' },
  });
}

// Guardar dos veces el mismo día reemplaza el plan de ese día (no se acumulan filas).
function guardar(usuarioId, desde, datos) {
  return prisma.planAlimentacion.upsert({
    where: { usuarioId_desde: { usuarioId, desde: dia(desde) } },
    create: { usuarioId, desde: dia(desde), ...datos },
    update: datos,
    select: SELECCION,
  });
}

// Lista de planes personalizados, en el orden en que se crearon.
function personalizados(usuarioId) {
  return prisma.planPersonalizado.findMany({ where: { usuarioId }, select: SELECCION_PERSONALIZADO, orderBy: { id: 'asc' } });
}

const contarPersonalizados = (usuarioId) => prisma.planPersonalizado.count({ where: { usuarioId } });

// Solo los planes propios: un id ajeno se trata como inexistente.
const obtenerPersonalizado = (id, usuarioId) => prisma.planPersonalizado.findFirst({ where: { id, usuarioId }, select: SELECCION_PERSONALIZADO });

const crearPersonalizado = (usuarioId, datos) => prisma.planPersonalizado.create({ data: { usuarioId, ...datos }, select: SELECCION_PERSONALIZADO });

const actualizarPersonalizado = (id, datos) => prisma.planPersonalizado.update({ where: { id }, data: datos, select: SELECCION_PERSONALIZADO });

// Los días que lo usaron conservan su copia de los porcentajes (plan_personalizado_id queda en NULL).
const eliminarPersonalizado = (id) => prisma.planPersonalizado.delete({ where: { id } });

const SELECCION_META = { objetivo: true, pesoInicialKg: true, pesoObjetivoKg: true, ritmoSemanalKg: true, fechaInicio: true };

const metaPeso = (usuarioId) => prisma.metaPeso.findUnique({ where: { usuarioId }, select: SELECCION_META });

function guardarMetaPeso(usuarioId, datos) {
  return prisma.metaPeso.upsert({ where: { usuarioId }, create: { usuarioId, ...datos }, update: datos, select: SELECCION_META });
}

const eliminarMetaPeso = (usuarioId) => prisma.metaPeso.deleteMany({ where: { usuarioId } });

module.exports = {
  vigente, guardar, personalizados, contarPersonalizados, obtenerPersonalizado, crearPersonalizado, actualizarPersonalizado,
  eliminarPersonalizado, metaPeso, guardarMetaPeso, eliminarMetaPeso,
};

// Plan de alimentación (11-11-2026).
// - planes_alimentacion: cada cambio es una fila que rige desde su día. El plan de una fecha es el último guardado ese
//   día o antes; sin filas, el plan es el de la meta del perfil.
// - planes_personalizados: la lista de repartos propios de cada usuario.
// - metas_peso: el peso al que quiere llegar y a qué ritmo; como el plan, cada cambio rige desde su día (12-11-2026).
const { Prisma } = require('@prisma/client');
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

// Solo los planes propios: un id ajeno se trata como inexistente.
const obtenerPersonalizado = (id, usuarioId) => prisma.planPersonalizado.findFirst({ where: { id, usuarioId }, select: SELECCION_PERSONALIZADO });

// Crea un plan solo si el usuario tiene menos del máximo; si ya lo alcanzó, devuelve null (revisión del PR #52). La fila
// del usuario se bloquea antes de contar: dos solicitudes simultáneas se ordenan y la segunda cuenta el plan que guardó
// la primera, así nunca quedan más del máximo.
function crearPersonalizado(usuarioId, datos, maximo) {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM usuarios WHERE id = ${usuarioId} FOR UPDATE`;
    if (await tx.planPersonalizado.count({ where: { usuarioId } }) >= maximo) return null;
    return tx.planPersonalizado.create({ data: { usuarioId, ...datos }, select: SELECCION_PERSONALIZADO });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });
}

const actualizarPersonalizado = (id, datos) => prisma.planPersonalizado.update({ where: { id }, data: datos, select: SELECCION_PERSONALIZADO });

// Los días que lo usaron conservan su copia de los porcentajes (plan_personalizado_id queda en NULL).
const eliminarPersonalizado = (id) => prisma.planPersonalizado.delete({ where: { id } });

const SELECCION_META = { objetivo: true, pesoInicialKg: true, pesoObjetivoKg: true, ritmoSemanalKg: true, fechaInicio: true, desde: true };

// Meta de peso que rige en una fecha (revisión del PR #52): la última guardada ese día o antes. Si esa fila es una baja
// (activa = false), ese día no hay meta. Así, cambiar la meta hoy no cambia el objetivo de los días anteriores.
async function metaPeso(usuarioId, fecha) {
  const fila = await prisma.metaPeso.findFirst({
    where: { usuarioId, desde: { lte: dia(fecha) } },
    select: { ...SELECCION_META, activa: true },
    orderBy: { desde: 'desc' },
  });
  if (!fila?.activa) return null;
  const { objetivo, pesoInicialKg, pesoObjetivoKg, ritmoSemanalKg, fechaInicio, desde } = fila;
  return { objetivo, pesoInicialKg, pesoObjetivoKg, ritmoSemanalKg, fechaInicio, desde };
}

// Guardar dos veces el mismo día reemplaza la meta de ese día; los días anteriores conservan la suya.
function guardarMetaPeso(usuarioId, desde, datos) {
  return prisma.metaPeso.upsert({
    where: { usuarioId_desde: { usuarioId, desde: dia(desde) } },
    create: { usuarioId, desde: dia(desde), activa: true, ...datos },
    update: { ...datos, activa: true },
    select: SELECCION_META,
  });
}

// Quitar la meta desde un día: queda una fila de baja con los valores de la meta que regía (las restricciones de la
// tabla los exigen). Los días anteriores la conservan.
async function eliminarMetaPeso(usuarioId, desde) {
  const vigente = await metaPeso(usuarioId, desde);
  if (!vigente) return;
  const { objetivo, pesoInicialKg, pesoObjetivoKg, ritmoSemanalKg, fechaInicio } = vigente;
  await prisma.metaPeso.upsert({
    where: { usuarioId_desde: { usuarioId, desde: dia(desde) } },
    create: { usuarioId, desde: dia(desde), activa: false, objetivo, pesoInicialKg, pesoObjetivoKg, ritmoSemanalKg, fechaInicio },
    update: { activa: false },
  });
}

module.exports = {
  vigente, guardar, personalizados, obtenerPersonalizado, crearPersonalizado, actualizarPersonalizado,
  eliminarPersonalizado, metaPeso, guardarMetaPeso, eliminarMetaPeso,
};

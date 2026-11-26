// Logros y medallas (25-11-2026). Lee los datos que ya registra la persona (comidas, agua, citas, reseñas, chats con el
// asistente, favoritos y planes) y guarda en medallas_usuario las medallas ganadas, para conservarlas y avisar las nuevas.
const prisma = require('./prisma');

const comoDia = (fecha) => new Date(`${fecha}T00:00:00Z`);

// Calorías de cada día con comidas registradas, hasta hoy.
const caloriasPorDia = (usuarioId, hasta) => prisma.registroComida.groupBy({
  by: ['fecha'], where: { usuarioId, fecha: { lte: comoDia(hasta) } }, _sum: { calorias: true },
});

// Agua total de cada día con registros, hasta hoy.
const aguaPorDia = (usuarioId, hasta) => prisma.registroAgua.groupBy({
  by: ['fecha'], where: { usuarioId, fecha: { lte: comoDia(hasta) } }, _sum: { ml: true },
});

// Alimentos distintos del catálogo que la persona registró alguna vez.
async function alimentosDistintos(usuarioId) {
  const filas = await prisma.registroComida.groupBy({ by: ['alimentoId'], where: { usuarioId, alimentoId: { not: null } } });
  return filas.length;
}

// Momentos del día con registros en cada fecha (para «Plato arcoíris»).
const momentosPorDia = (usuarioId) => prisma.registroComida.groupBy({ by: ['fecha', 'momento'], where: { usuarioId } });

// Hora en que se registró cada desayuno (para «Madrugador»).
const desayunos = (usuarioId) => prisma.registroComida.findMany({
  where: { usuarioId, momento: 'desayuno' }, select: { fecha: true, fechaCreacion: true },
});

// Citas confirmadas de la persona con la fecha de su horario.
const citasConfirmadas = (usuarioId) => prisma.reserva.findMany({
  where: { usuarioId, estado: 'confirmada' }, select: { disponibilidad: { select: { fecha: true } } },
});

async function conteos(usuarioId) {
  const [resenas, conversaciones, favoritos, planesPropios] = await Promise.all([
    prisma.resena.count({ where: { usuarioId } }),
    prisma.conversacion.count({ where: { usuarioId } }),
    prisma.favorito.count({ where: { usuarioId } }),
    prisma.planComida.count({ where: { usuarioId, origen: 'propio' } }),
  ]);
  return { resenas, conversaciones, favoritos, planesPropios };
}

const ganadas = (usuarioId) => prisma.medallaUsuario.findMany({
  where: { usuarioId }, orderBy: [{ fechaObtenida: 'desc' }, { id: 'desc' }],
});

// Guarda las medallas recién ganadas; las que ya estaban no se tocan (conservan su fecha y si ya se vieron).
const guardar = (usuarioId, medallas) => prisma.medallaUsuario.createMany({
  data: medallas.map(({ clave, nivel, periodo }) => ({ usuarioId, clave, nivel, periodo })), skipDuplicates: true,
});

const marcarVistas = (usuarioId) => prisma.medallaUsuario.updateMany({ where: { usuarioId, vista: false }, data: { vista: true } });

module.exports = {
  caloriasPorDia, aguaPorDia, alimentosDistintos, momentosPorDia, desayunos, citasConfirmadas, conteos, ganadas, guardar, marcarVistas,
};

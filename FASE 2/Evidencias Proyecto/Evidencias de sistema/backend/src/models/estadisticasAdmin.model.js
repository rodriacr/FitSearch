// Datos del dashboard y los reportes del administrador (11-11-2026). Se traen filas mínimas de un rango de fechas y el
// servicio las agrupa por día de Chile (la base guarda las fechas y horas en UTC).
const prisma = require('./prisma');

const rango = (desde, hasta) => ({ gte: desde, lt: hasta });
// Columnas de tipo DATE (el día ya viene cortado): se comparan con fechas 'AAAA-MM-DD'.
const entreDias = (desde, hasta) => ({ gte: new Date(`${desde}T00:00:00Z`), lte: new Date(`${hasta}T00:00:00Z`) });
const profesionalVigente = { usuario: { rol: { nombre: 'profesional' } } };

const cuentas = (desde, hasta) => prisma.usuario.findMany({
  where: { fechaRegistro: rango(desde, hasta) }, select: { fechaRegistro: true, rol: { select: { nombre: true } } },
});

const ultimasCuentas = (limite) => prisma.usuario.findMany({
  select: { id: true, nombre: true, activo: true, fechaRegistro: true, rol: { select: { nombre: true } } },
  orderBy: [{ fechaRegistro: 'desc' }, { id: 'desc' }], take: limite,
});

const reservas = (desde, hasta) => prisma.reserva.findMany({
  where: { fechaCreacion: rango(desde, hasta) },
  select: { fechaCreacion: true, estado: true, usuarioId: true, disponibilidad: { select: { profesionalId: true, profesional: { select: { especialidad: true } } } } },
});

const resenas = (desde, hasta) => prisma.resena.findMany({
  where: { fechaCreacion: rango(desde, hasta) }, select: { fechaCreacion: true, puntaje: true, reservaId: true },
});

// Preguntas que las personas le hacen al asistente (no se cuentan las respuestas).
const preguntasAsistente = (desde, hasta) => prisma.mensaje.findMany({
  where: { remitente: 'usuario', fecha: rango(desde, hasta) }, select: { fecha: true, conversacion: { select: { usuarioId: true } } },
});

// Todas las fichas profesionales vigentes: son pocas y de aquí salen el embudo, la cola y las distribuciones.
const profesionales = () => prisma.profesional.findMany({
  where: profesionalVigente,
  select: {
    id: true, especialidad: true, comuna: true, verificado: true, estadoVerificacion: true, historialVerificacion: true,
    usuario: { select: { nombre: true, activo: true } }, _count: { select: { documentos: true } },
  },
});

// Personas distintas que usaron cada función en el período.
async function personasPorFuncion(desde, hasta, diaDesde, diaHasta) {
  const distintas = (consulta) => consulta.then((filas) => filas.length);
  const [asistente, comidas, agua, reservasHechas, favoritos, planes] = await Promise.all([
    distintas(prisma.conversacion.findMany({
      where: { mensajes: { some: { remitente: 'usuario', fecha: rango(desde, hasta) } } }, select: { usuarioId: true }, distinct: ['usuarioId'],
    })),
    distintas(prisma.registroComida.groupBy({ by: ['usuarioId'], where: { fecha: entreDias(diaDesde, diaHasta) } })),
    distintas(prisma.registroAgua.groupBy({ by: ['usuarioId'], where: { fecha: entreDias(diaDesde, diaHasta) } })),
    distintas(prisma.reserva.groupBy({ by: ['usuarioId'], where: { fechaCreacion: rango(desde, hasta) } })),
    distintas(prisma.favorito.groupBy({ by: ['usuarioId'], where: { fechaCreacion: rango(desde, hasta) } })),
    distintas(prisma.planPersonalizado.groupBy({ by: ['usuarioId'], where: { fechaCreacion: rango(desde, hasta) } })),
  ]);
  return { asistente, comidas, agua, reservas: reservasHechas, favoritos, planes };
}

async function plataforma() {
  const [usuariosActivos, usuariosInactivos, profesionalesActivos, establecimientos] = await Promise.all([
    prisma.usuario.count({ where: { rol: { nombre: 'usuario' }, activo: true } }),
    prisma.usuario.count({ where: { activo: false } }),
    prisma.usuario.count({ where: { rol: { nombre: 'profesional' }, activo: true } }),
    prisma.establecimiento.groupBy({ by: ['categoria'], where: { activo: true }, _count: { _all: true } }),
  ]);
  return {
    usuariosActivos, usuariosInactivos, profesionalesActivos,
    establecimientos: Object.fromEntries(establecimientos.map((fila) => [fila.categoria, fila._count._all])),
  };
}

const verificacionesPendientes = () => prisma.profesional.count({ where: { ...profesionalVigente, estadoVerificacion: 'pendiente' } });

module.exports = {
  cuentas, ultimasCuentas, reservas, resenas, preguntasAsistente, profesionales, personasPorFuncion, plataforma, verificacionesPendientes,
};

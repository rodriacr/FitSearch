const { Prisma } = require('@prisma/client');
const prisma = require('./prisma');
const ErrorHttp = require('../utils/ErrorHttp');
const { documentoPublico } = require('./verificacion.model');

const seleccionUsuario = { id: true, nombre: true, correo: true, activo: true, fechaRegistro: true, rol: { select: { nombre: true } } };
const seleccionProfesional = {
  id: true, especialidad: true, descripcion: true, comuna: true, modalidad: true, verificado: true,
  estadoVerificacion: true, motivoRechazo: true, revisionVerificacion: true, rut: true, telefono: true,
  usuario: { select: seleccionUsuario },
};
const profesionalVigente = { usuario: { rol: { nombre: 'profesional' } } };

async function listarUsuarios({ q, rol, estadoCuenta, pagina, limite }) {
  const where = {
    ...(rol && { rol: { nombre: rol } }),
    ...(estadoCuenta && { activo: estadoCuenta === 'activos' }),
    ...(q && { OR: [{ nombre: { contains: q } }, { correo: { contains: q } }] }),
  };
  const [filas, total] = await Promise.all([
    prisma.usuario.findMany({ where, select: seleccionUsuario, orderBy: [{ nombre: 'asc' }, { id: 'asc' }], skip: (pagina - 1) * limite, take: limite }),
    prisma.usuario.count({ where }),
  ]);
  return { filas, total };
}

// Dos vistas (11-11-2026): «cola» (Verificaciones) trae todas las fichas del filtro con su historial y documentos, para
// ordenarlas por antigüedad de la solicitud en el servicio; «directorio» (Profesionales) pagina por nombre y suma la
// calificación y las reservas de cada ficha de la página.
async function listarProfesionales({ q, estado, pagina, limite, vista = 'directorio' }) {
  const where = {
    ...profesionalVigente,
    ...(estado && { estadoVerificacion: { pendientes: 'pendiente', verificados: 'verificado', rechazados: 'rechazado' }[estado] }),
    ...(q && { OR: [{ usuario: { nombre: { contains: q } } }, { especialidad: { contains: q } }, { comuna: { contains: q } }] }),
  };
  if (vista === 'cola') {
    const filas = await prisma.profesional.findMany({
      where, select: { ...seleccionProfesional, historialVerificacion: true, _count: { select: { documentos: true } } }, orderBy: { id: 'asc' },
    });
    return { filas, total: filas.length };
  }
  const [filas, total] = await Promise.all([
    prisma.profesional.findMany({ where, select: seleccionProfesional, orderBy: [{ usuario: { nombre: 'asc' } }, { id: 'asc' }], skip: (pagina - 1) * limite, take: limite }),
    prisma.profesional.count({ where }),
  ]);
  if (!filas.length) return { filas, total };
  const ids = filas.map((fila) => fila.id);
  const [calificaciones, reservas] = await Promise.all([
    prisma.resena.groupBy({ by: ['profesionalId'], where: { profesionalId: { in: ids } }, _avg: { puntaje: true }, _count: { _all: true } }),
    prisma.$queryRaw`SELECT d.profesional_id AS profesionalId, COUNT(*) AS total FROM reservas r
      JOIN disponibilidades d ON d.id = r.disponibilidad_id
      WHERE d.profesional_id IN (${Prisma.join(ids)}) AND r.estado <> 'cancelada' GROUP BY d.profesional_id`,
  ]);
  const calificacion = new Map(calificaciones.map((fila) => [fila.profesionalId, { promedio: fila._avg.puntaje, total: fila._count._all }]));
  const reservasPor = new Map(reservas.map((fila) => [Number(fila.profesionalId), Number(fila.total)]));
  return {
    filas: filas.map((fila) => ({ ...fila, calificacion: calificacion.get(fila.id) ?? null, reservas: reservasPor.get(fila.id) ?? 0 })),
    total,
  };
}

function detalleProfesional(id) {
  return prisma.profesional.findFirst({ where: { ...profesionalVigente, id }, select: { ...seleccionProfesional, historialVerificacion: true, documentos: { select: documentoPublico, orderBy: [{ fechaCreacion: 'desc' }, { id: 'desc' }] } } });
}

async function cambiarEstadoUsuario(id, activo) {
  return prisma.$transaction(async (tx) => {
    const cuenta = await tx.usuario.findUnique({ where: { id }, select: seleccionUsuario });
    if (!cuenta) throw new ErrorHttp(404, 'No encontramos esta cuenta');
    if (cuenta.rol.nombre === 'administrador') throw new ErrorHttp(409, 'Las cuentas administrativas no se desactivan desde este panel');
    if (cuenta.activo !== activo) await tx.usuario.update({ where: { id }, data: { activo, versionSesion: { increment: 1 } } });
    return { id, activo };
  });
}

module.exports = { listarUsuarios, listarProfesionales, detalleProfesional, cambiarEstadoUsuario };

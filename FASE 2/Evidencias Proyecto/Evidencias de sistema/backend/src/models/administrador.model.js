const prisma = require('./prisma');

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

async function listarProfesionales({ q, estado, pagina, limite }) {
  const where = {
    ...profesionalVigente,
    ...(estado && { estadoVerificacion: { pendientes: 'pendiente', verificados: 'verificado', rechazados: 'rechazado' }[estado] }),
    ...(q && { OR: [{ usuario: { nombre: { contains: q } } }, { especialidad: { contains: q } }, { comuna: { contains: q } }] }),
  };
  const [filas, total] = await Promise.all([
    prisma.profesional.findMany({ where, select: seleccionProfesional, orderBy: { id: 'asc' }, skip: (pagina - 1) * limite, take: limite }),
    prisma.profesional.count({ where }),
  ]);
  return { filas, total };
}

function detalleProfesional(id) {
  return prisma.profesional.findFirst({ where: { ...profesionalVigente, id }, select: { ...seleccionProfesional, historialVerificacion: true, documentos: { select: require('./verificacion.model').documentoPublico, orderBy: [{ fechaCreacion: 'desc' }, { id: 'desc' }] } } });
}

async function cambiarEstadoUsuario(id, activo) {
  const ErrorHttp = require('../utils/ErrorHttp');
  return prisma.$transaction(async (tx) => {
    const cuenta = await tx.usuario.findUnique({ where: { id }, select: seleccionUsuario });
    if (!cuenta) throw new ErrorHttp(404, 'No encontramos esta cuenta');
    if (cuenta.rol.nombre === 'administrador') throw new ErrorHttp(409, 'Las cuentas administrativas no se desactivan desde este panel');
    if (cuenta.activo !== activo) await tx.usuario.update({ where: { id }, data: { activo, versionSesion: { increment: 1 } } });
    return { id, activo };
  });
}

async function resumen(desde, hasta) {
  const periodo = { fechaRegistro: { gte: desde, lt: hasta } };
  const [usuarios, profesionales, pendientes, verificados, nuevosUsuarios, nuevosProfesionales, registros] = await Promise.all([
    prisma.usuario.count(),
    prisma.usuario.count({ where: { rol: { nombre: 'profesional' } } }),
    prisma.profesional.count({ where: { ...profesionalVigente, estadoVerificacion: 'pendiente' } }),
    prisma.profesional.count({ where: { ...profesionalVigente, verificado: true } }),
    prisma.usuario.count({ where: periodo }),
    prisma.usuario.count({ where: { ...periodo, rol: { nombre: 'profesional' } } }),
    prisma.$queryRaw`SELECT DATE(u.fecha_registro) AS fecha, r.nombre AS rol, COUNT(*) AS cantidad
      FROM usuarios u JOIN roles r ON r.id = u.rol_id
      WHERE u.fecha_registro >= ${desde} AND u.fecha_registro < ${hasta}
      GROUP BY DATE(u.fecha_registro), r.nombre ORDER BY fecha ASC, rol ASC`,
  ]);
  return { usuarios, profesionales, pendientes, verificados, nuevosUsuarios, nuevosProfesionales, registros };
}

module.exports = { listarUsuarios, listarProfesionales, detalleProfesional, resumen, cambiarEstadoUsuario };

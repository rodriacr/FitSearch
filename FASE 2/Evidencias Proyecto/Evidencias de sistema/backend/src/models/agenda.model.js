const prisma = require('./prisma');
const ErrorHttp = require('../utils/ErrorHttp');
const ACTIVOS = ['pendiente', 'confirmada'];
const reservaInclude = {
  usuario: { select: { id: true, nombre: true } },
  disponibilidad: {
    include: {
      profesional: {
        include: { usuario: { select: { nombre: true, activo: true } } },
      },
    },
  },
};
const ocupado = {
  reservas: { where: { estado: { in: ACTIVOS } }, select: { id: true } },
  _count: { select: { reservas: true } },
};
const instante = (b) => ({
  fecha: b.fecha.toISOString().slice(0, 10),
  horaInicio: b.horaInicio.toISOString().slice(11, 16),
});
async function bloquear(tx, profesionalId) {
  // Se serializan todas las escrituras de agenda del mismo profesional, incluida la reserva.
  const filas =
    await tx.$queryRaw`SELECT id FROM profesionales WHERE id = ${profesionalId} FOR UPDATE`;
  if (!filas.length)
    throw new ErrorHttp(404, 'No encontramos este profesional');
}
async function propia(tx, usuarioId) {
  const f = await tx.profesional.findUnique({ where: { usuarioId } });
  if (!f)
    throw new ErrorHttp(
      409,
      'Completa tu ficha profesional antes de publicar horarios',
    );
  return f;
}
async function listarDisponibilidad(usuario, profesionalId, fechaDesde) {
  const f = profesionalId
    ? await prisma.profesional.findFirst({
        where: {
          id: profesionalId,
          usuario: { activo: true, rol: { nombre: 'profesional' } },
        },
      })
    : await propia(prisma, usuario.id);
  if (!f) throw new ErrorHttp(404, 'No encontramos este profesional');
  return prisma.disponibilidad.findMany({
    where: {
      profesionalId: f.id,
      retirado: false,
      fecha: { gte: fechaDesde },
      ...(profesionalId && { reservas: { none: { estado: { in: ACTIVOS } } } }),
    },
    include: profesionalId ? { reservas: ocupado.reservas } : ocupado,
    orderBy: [{ fecha: 'asc' }, { horaInicio: 'asc' }],
  });
}
async function guardarDisponibilidad(usuarioId, id, datos) {
  return prisma.$transaction(
    async (tx) => {
      const f = await propia(tx, usuarioId);
      await bloquear(tx, f.id);
      if (id) {
        const actual = await tx.disponibilidad.findUnique({
          where: { id },
          include: ocupado,
        });
        if (!actual) throw new ErrorHttp(404, 'No encontramos este horario');
        if (actual.profesionalId !== f.id)
          throw new ErrorHttp(403, 'Solo puedes modificar tus horarios');
        if (actual.retirado)
          throw new ErrorHttp(
            409,
            'Este horario está retirado. Publica un bloque nuevo',
          );
        // No se cambia un bloque usado: preserva la fecha de las reservas también canceladas.
        if (await tx.reserva.count({ where: { disponibilidadId: id } }))
          throw new ErrorHttp(
            409,
            'Este horario tiene reservas. Publica un bloque nuevo',
          );
      }
      // Los parámetros numéricos evitan la conversión de cadenas TIME de Prisma/MySQL.
      const segundos = (hora) =>
        hora.getUTCHours() * 3600 + hora.getUTCMinutes() * 60;
      const inicio = segundos(datos.horaInicio);
      const fin = segundos(datos.horaFin);
      const excluir = id || 0;
      const superpuestos = await tx.$queryRaw`SELECT id FROM disponibilidades
      WHERE profesional_id = ${f.id} AND fecha = DATE(${datos.fecha}) AND retirado = FALSE
        AND TIME_TO_SEC(hora_inicio) < ${fin} AND TIME_TO_SEC(hora_fin) > ${inicio}
        AND id <> ${excluir} LIMIT 1`;
      if (superpuestos.length)
        throw new ErrorHttp(
          409,
          'Este horario se superpone con otro bloque publicado',
        );
      return id
        ? tx.disponibilidad.update({
            where: { id },
            data: datos,
            include: ocupado,
          })
        : tx.disponibilidad.create({
            data: { ...datos, profesionalId: f.id },
            include: ocupado,
          });
    },
    { isolationLevel: 'ReadCommitted' },
  );
}
async function eliminarDisponibilidad(usuarioId, id) {
  return prisma.$transaction(
    async (tx) => {
      const f = await propia(tx, usuarioId);
      await bloquear(tx, f.id);
      const b = await tx.disponibilidad.findUnique({ where: { id } });
      if (!b) throw new ErrorHttp(404, 'No encontramos este horario');
      if (b.profesionalId !== f.id)
        throw new ErrorHttp(403, 'Solo puedes eliminar tus horarios');
      if (
        await tx.reserva.count({
          where: { disponibilidadId: id, estado: { in: ACTIVOS } },
        })
      )
        throw new ErrorHttp(
          409,
          'Cancela la reserva activa antes de retirar este horario',
        );
      if (await tx.reserva.count({ where: { disponibilidadId: id } })) {
        await tx.disponibilidad.update({
          where: { id },
          data: { retirado: true },
        });
        return { id, retirado: true };
      }
      await tx.disponibilidad.delete({ where: { id } });
      return { id };
    },
    { isolationLevel: 'ReadCommitted' },
  );
}
function listarReservas(usuario) {
  const where =
    usuario.rol === 'profesional'
      ? { disponibilidad: { profesional: { usuarioId: usuario.id } } }
      : { usuarioId: usuario.id };
  return prisma.reserva.findMany({
    where,
    include: reservaInclude,
    orderBy: [
      { disponibilidad: { fecha: 'asc' } },
      { disponibilidad: { horaInicio: 'asc' } },
      { id: 'desc' },
    ],
  });
}
async function crearReserva(
  usuarioId,
  { disponibilidadId, mensaje },
  esFuturo,
) {
  return prisma.$transaction(
    async (tx) => {
      const b = await tx.disponibilidad.findUnique({
        where: { id: disponibilidadId },
      });
      if (!b) throw new ErrorHttp(404, 'No encontramos este horario');
      await bloquear(tx, b.profesionalId);
      // Lectura con bloqueo después del padre: evita snapshots previos y detecta un borrado concurrente.
      const vivos =
        await tx.$queryRaw`SELECT id FROM disponibilidades WHERE id = ${disponibilidadId} FOR UPDATE`;
      if (!vivos.length)
        throw new ErrorHttp(409, 'El horario ya no está disponible');
      const actual = await tx.disponibilidad.findUnique({
        where: { id: disponibilidadId },
        include: {
          profesional: { include: { usuario: { include: { rol: true } } } },
        },
      });
      if (
        actual.retirado ||
        !actual.profesional.usuario.activo ||
        actual.profesional.usuario.rol.nombre !== 'profesional' ||
        !esFuturo(instante(actual))
      )
        throw new ErrorHttp(409, 'El horario ya no está disponible');
      const activas =
        await tx.$queryRaw`SELECT id FROM reservas WHERE disponibilidad_id = ${disponibilidadId} AND estado IN ('pendiente', 'confirmada') FOR UPDATE`;
      if (activas.length)
        throw new ErrorHttp(409, 'El horario ya no está disponible');
      const delUsuario = await tx.reserva.findMany({
        where: {
          usuarioId,
          estado: { in: ACTIVOS },
          disponibilidad: { profesionalId: actual.profesionalId },
        },
        select: { disponibilidad: { select: { fecha: true, horaInicio: true } } },
      });
      // Las citas que ya pasaron quedan en el historial (no se pueden cancelar) y no cuentan para el límite.
      if (delUsuario.some((r) => esFuturo(instante(r.disponibilidad))))
        throw new ErrorHttp(
          409,
          'Ya tienes una reserva activa con este profesional. Cancélala antes de reservar otra hora',
          { motivo: 'limite_por_profesional' },
        );
      return tx.reserva.create({
        data: { usuarioId, disponibilidadId, mensaje },
        include: reservaInclude,
      });
    },
    { isolationLevel: 'ReadCommitted' },
  );
}
async function cambiarReserva(usuario, id, estado, esFuturo) {
  return prisma.$transaction(
    async (tx) => {
      const r = await tx.reserva.findUnique({
        where: { id },
        include: reservaInclude,
      });
      if (!r) throw new ErrorHttp(404, 'No encontramos esta reserva');
      const profesional =
        usuario.rol === 'profesional' &&
        r.disponibilidad.profesional.usuarioId === usuario.id;
      const cliente = usuario.rol === 'usuario' && r.usuarioId === usuario.id;
      if (!profesional && !cliente)
        throw new ErrorHttp(
          403,
          'No tienes permisos para modificar esta reserva',
        );
      if (estado === 'confirmada' && !profesional)
        throw new ErrorHttp(
          403,
          'Solo el profesional puede confirmar una reserva',
        );
      await bloquear(tx, r.disponibilidad.profesionalId);
      const actual =
        await tx.$queryRaw`SELECT estado FROM reservas WHERE id = ${id} FOR UPDATE`;
      if (actual[0].estado === 'cancelada')
        throw new ErrorHttp(
          409,
          'La reserva está cancelada y no puede reactivarse',
        );
      if (!esFuturo(instante(r.disponibilidad)))
        throw new ErrorHttp(
          409,
          'El horario ya pasó; la reserva se conserva en el historial',
        );
      return tx.reserva.update({
        where: { id },
        data: { estado },
        include: reservaInclude,
      });
    },
    { isolationLevel: 'ReadCommitted' },
  );
}
module.exports = {
  listarDisponibilidad,
  guardarDisponibilidad,
  eliminarDisponibilidad,
  listarReservas,
  crearReserva,
  cambiarReserva,
};

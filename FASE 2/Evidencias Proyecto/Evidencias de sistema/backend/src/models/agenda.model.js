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
// Fechas bloqueadas (vacaciones, congresos): sus horarios no se muestran, no se reservan ni se publican.
const dentroDe = (fecha, bloqueos) =>
  bloqueos.some((b) => b.fechaInicio <= fecha && b.fechaFin >= fecha);
const bloqueosDesde = (tx, profesionalId, desde) =>
  tx.bloqueoAgenda.findMany({
    where: { profesionalId, fechaFin: { gte: desde } },
    orderBy: { fechaInicio: 'asc' },
  });
async function enBloqueo(tx, profesionalId, fecha) {
  return (
    (await tx.bloqueoAgenda.count({
      where: {
        profesionalId,
        fechaInicio: { lte: fecha },
        fechaFin: { gte: fecha },
      },
    })) > 0
  );
}
const SUPERPUESTOS = (tx, profesionalId, fecha, inicio, fin, excluir) =>
  tx.$queryRaw`SELECT id FROM disponibilidades
      WHERE profesional_id = ${profesionalId} AND fecha = DATE(${fecha}) AND retirado = FALSE
        AND TIME_TO_SEC(hora_inicio) < ${fin} AND TIME_TO_SEC(hora_fin) > ${inicio}
        AND id <> ${excluir} LIMIT 1`;
// Los parámetros numéricos evitan la conversión de cadenas TIME de Prisma/MySQL.
const segundos = (hora) =>
  hora.getUTCHours() * 3600 + hora.getUTCMinutes() * 60;
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
  const [bloques, bloqueos] = await Promise.all([
    prisma.disponibilidad.findMany({
      where: {
        profesionalId: f.id,
        retirado: false,
        fecha: { gte: fechaDesde },
        ...(profesionalId && { reservas: { none: { estado: { in: ACTIVOS } } } }),
      },
      include: profesionalId ? { reservas: ocupado.reservas } : ocupado,
      orderBy: [{ fecha: 'asc' }, { horaInicio: 'asc' }],
    }),
    profesionalId ? bloqueosDesde(prisma, f.id, fechaDesde) : [],
  ]);
  // Quien reserva no ve los horarios de las fechas bloqueadas; el profesional sí (los ve en su agenda).
  return bloqueos.length ? bloques.filter((b) => !dentroDe(b.fecha, bloqueos)) : bloques;
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
      if (await enBloqueo(tx, f.id, datos.fecha))
        throw new ErrorHttp(
          409,
          'Ese día está bloqueado en tu agenda. Quita el bloqueo para publicar horarios',
        );
      const superpuestos = await SUPERPUESTOS(
        tx,
        f.id,
        datos.fecha,
        segundos(datos.horaInicio),
        segundos(datos.horaFin),
        id || 0,
      );
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
  { disponibilidadId, mensaje, modalidad, primeraVisita },
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
        !esFuturo(instante(actual)) ||
        (await enBloqueo(tx, actual.profesionalId, actual.fecha))
      )
        throw new ErrorHttp(409, 'El horario ya no está disponible');
      // Quien atiende de ambas formas deja elegir; si atiende de una sola, la reserva toma esa.
      const { modalidad: atiende, autoconfirmar } = actual.profesional;
      if (atiende === 'ambas' && !['presencial', 'online'].includes(modalidad))
        throw new ErrorHttp(400, 'Elige si te atenderás presencial u online', {
          modalidad: 'Elige si te atenderás presencial u online',
        });
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
        data: {
          usuarioId,
          disponibilidadId,
          mensaje,
          modalidad: atiende === 'ambas' ? modalidad : atiende,
          primeraVisita: typeof primeraVisita === 'boolean' ? primeraVisita : null,
          // FS-HU-29: si el profesional lo configuró, la reserva nace confirmada.
          ...(autoconfirmar && { estado: 'confirmada', fechaCambio: new Date() }),
        },
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
        data: {
          estado,
          fechaCambio: new Date(),
          ...(estado === 'cancelada' && {
            canceladaPor: profesional ? 'profesional' : 'usuario',
          }),
        },
        include: reservaInclude,
      });
    },
    { isolationLevel: 'ReadCommitted' },
  );
}
// Varios bloques del mismo día de una vez (p. ej., 09:00 a 13:00 en bloques de 45 minutos). Se publican los que no
// chocan con otro horario y se informan los omitidos; si el día está bloqueado no se publica ninguno.
async function guardarSerie(usuarioId, bloques) {
  return prisma.$transaction(
    async (tx) => {
      const f = await propia(tx, usuarioId);
      await bloquear(tx, f.id);
      if (await enBloqueo(tx, f.id, bloques[0].fecha))
        throw new ErrorHttp(
          409,
          'Ese día está bloqueado en tu agenda. Quita el bloqueo para publicar horarios',
        );
      const creados = [];
      const omitidos = [];
      for (const datos of bloques) {
        const choca = await SUPERPUESTOS(
          tx,
          f.id,
          datos.fecha,
          segundos(datos.horaInicio),
          segundos(datos.horaFin),
          0,
        );
        if (choca.length) omitidos.push(datos);
        else
          creados.push(
            await tx.disponibilidad.create({
              data: { ...datos, profesionalId: f.id },
              include: ocupado,
            }),
          );
      }
      return { creados, omitidos };
    },
    { isolationLevel: 'ReadCommitted' },
  );
}
// Semana del calendario del profesional: sus horarios (también los ya pasados de esa semana), la reserva activa de cada
// uno, los bloqueos que la tocan y cuántas personas esperan una hora.
async function semana(usuarioId, desde, hasta) {
  const f = await propia(prisma, usuarioId);
  const [bloques, bloqueos, enEspera] = await Promise.all([
    prisma.disponibilidad.findMany({
      where: {
        profesionalId: f.id,
        fecha: { gte: desde, lte: hasta },
        OR: [
          { retirado: false },
          { reservas: { some: { estado: { in: ACTIVOS } } } },
        ],
      },
      include: {
        reservas: {
          where: { estado: { in: ACTIVOS } },
          include: { usuario: { select: { id: true, nombre: true } } },
          take: 1,
        },
        _count: { select: { reservas: true } },
      },
      orderBy: [{ fecha: 'asc' }, { horaInicio: 'asc' }],
    }),
    prisma.bloqueoAgenda.findMany({
      where: {
        profesionalId: f.id,
        fechaInicio: { lte: hasta },
        fechaFin: { gte: desde },
      },
      orderBy: { fechaInicio: 'asc' },
    }),
    prisma.listaEspera.count({ where: { profesionalId: f.id } }),
  ]);
  return { bloques, bloqueos, enEspera, modalidad: f.modalidad };
}
async function listarBloqueos(usuarioId, desde) {
  const f = await propia(prisma, usuarioId);
  return bloqueosDesde(prisma, f.id, desde);
}
async function crearBloqueo(usuarioId, datos) {
  return prisma.$transaction(
    async (tx) => {
      const f = await propia(tx, usuarioId);
      await bloquear(tx, f.id);
      const rango = {
        fechaInicio: { lte: datos.fechaFin },
        fechaFin: { gte: datos.fechaInicio },
      };
      if (await tx.bloqueoAgenda.count({ where: { profesionalId: f.id, ...rango } }))
        throw new ErrorHttp(409, 'Esas fechas ya están bloqueadas, total o parcialmente');
      const activas = await tx.reserva.count({
        where: {
          estado: { in: ACTIVOS },
          disponibilidad: {
            profesionalId: f.id,
            fecha: { gte: datos.fechaInicio, lte: datos.fechaFin },
          },
        },
      });
      if (activas)
        throw new ErrorHttp(
          409,
          `Tienes ${activas} ${activas === 1 ? 'reserva activa' : 'reservas activas'} en esas fechas. Cancélalas antes de bloquearlas`,
          { motivo: 'reservas_activas', cantidad: activas },
        );
      return tx.bloqueoAgenda.create({ data: { ...datos, profesionalId: f.id } });
    },
    { isolationLevel: 'ReadCommitted' },
  );
}
// Al quitar un bloqueo vuelven a verse sus horarios libres: se informa si hay alguno futuro para avisar a la lista de espera.
async function eliminarBloqueo(usuarioId, id, hoy) {
  return prisma.$transaction(
    async (tx) => {
      const f = await propia(tx, usuarioId);
      await bloquear(tx, f.id);
      const b = await tx.bloqueoAgenda.findUnique({ where: { id } });
      if (!b || b.profesionalId !== f.id)
        throw new ErrorHttp(404, 'No encontramos este bloqueo');
      await tx.bloqueoAgenda.delete({ where: { id } });
      const libres = await tx.disponibilidad.count({
        where: {
          profesionalId: f.id,
          retirado: false,
          fecha: { gte: b.fechaInicio > hoy ? b.fechaInicio : hoy, lte: b.fechaFin },
          reservas: { none: { estado: { in: ACTIVOS } } },
        },
      });
      return { id, profesionalId: f.id, liberaHoras: libres > 0 };
    },
    { isolationLevel: 'ReadCommitted' },
  );
}
module.exports = {
  ACTIVOS,
  dentroDe,
  listarDisponibilidad,
  guardarDisponibilidad,
  guardarSerie,
  eliminarDisponibilidad,
  listarReservas,
  crearReserva,
  cambiarReserva,
  semana,
  listarBloqueos,
  crearBloqueo,
  eliminarBloqueo,
};

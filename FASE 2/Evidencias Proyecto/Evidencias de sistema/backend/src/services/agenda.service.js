const modelo = require('../models/agenda.model');
const ErrorHttp = require('../utils/ErrorHttp');

function ahoraChile(ahora = new Date()) {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Santiago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(ahora);
  const p = Object.fromEntries(partes.map(({ type, value }) => [type, value]));
  return {
    fecha: `${p.year}-${p.month}-${p.day}`,
    hora: `${p.hour}:${p.minute}`,
  };
}
function validarHorario(datos, ahora = new Date()) {
  const { fecha, horaInicio, horaFin } = datos;
  const d = new Date(`${fecha}T00:00:00Z`);
  const hora = (h) =>
    typeof h === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(h);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(fecha || '') ||
    !Number.isFinite(d.getTime()) ||
    d.toISOString().slice(0, 10) !== fecha ||
    !hora(horaInicio) ||
    !hora(horaFin) ||
    horaFin <= horaInicio
  ) {
    throw new ErrorHttp(
      400,
      'Indica una fecha y horas válidas; el término debe ser posterior al inicio',
    );
  }
  const hoy = ahoraChile(ahora);
  if (fecha < hoy.fecha || (fecha === hoy.fecha && horaInicio <= hoy.hora))
    throw new ErrorHttp(
      400,
      'El horario debe comenzar en el futuro (hora de Chile)',
    );
  if (
    d.getTime() >
    new Date(`${hoy.fecha}T00:00:00Z`).getTime() + 365 * 86400000
  )
    throw new ErrorHttp(
      400,
      'Publica horarios dentro de los próximos doce meses',
    );
  return {
    fecha: d,
    horaInicio: new Date(`1970-01-01T${horaInicio}:00Z`),
    horaFin: new Date(`1970-01-01T${horaFin}:00Z`),
  };
}
const horario = (b) => ({
  id: b.id,
  fecha: b.fecha.toISOString().slice(0, 10),
  horaInicio: b.horaInicio.toISOString().slice(11, 16),
  horaFin: b.horaFin.toISOString().slice(11, 16),
  ocupado: Boolean(b.reservas?.length),
  ...(b._count?.reservas && { conHistorial: true }),
  ...(b.retirado && { retirado: true }),
});
function reserva(r) {
  return {
    id: r.id,
    estado: r.estado,
    mensaje: r.mensaje,
    fechaCreacion: r.fechaCreacion.toISOString(),
    horario: horario(r.disponibilidad),
    profesional: {
      id: r.disponibilidad.profesional.id,
      nombre: r.disponibilidad.profesional.usuario.nombre,
    },
    usuario: { id: r.usuario.id, nombre: r.usuario.nombre },
  };
}
const esFuturo = (b, ahora = ahoraChile()) =>
  b.fecha > ahora.fecha ||
  (b.fecha === ahora.fecha && b.horaInicio > ahora.hora);
async function listarDisponibilidad(usuario, profesionalId) {
  const ahora = ahoraChile();
  const bloques = await modelo.listarDisponibilidad(
    usuario,
    profesionalId,
    new Date(`${ahora.fecha}T00:00:00Z`),
  );
  return {
    horarios: bloques.map((b) => {
      const resultado = horario(b);
      if (profesionalId) delete resultado.conHistorial;
      return resultado;
    }).filter((b) => esFuturo(b, ahora)),
    zonaHoraria: 'America/Santiago',
  };
}
async function guardarDisponibilidad(usuarioId, id, datos) {
  return {
    horario: horario(
      await modelo.guardarDisponibilidad(usuarioId, id, validarHorario(datos)),
    ),
  };
}
const eliminarDisponibilidad = (usuarioId, id) =>
  modelo.eliminarDisponibilidad(usuarioId, id);
async function listarReservas(usuario) {
  return {
    reservas: (await modelo.listarReservas(usuario)).map(reserva),
    zonaHoraria: 'America/Santiago',
  };
}
async function crearReserva(usuarioId, datos) {
  if (
    typeof datos.mensaje !== 'string' ||
    datos.mensaje.trim().length < 10 ||
    datos.mensaje.trim().length > 500
  )
    throw new ErrorHttp(
      400,
      'Describe brevemente lo que necesitas (10 a 500 caracteres)',
    );
  return {
    reserva: reserva(
      await modelo.crearReserva(
        usuarioId,
        { ...datos, mensaje: datos.mensaje.trim() },
        esFuturo,
      ),
    ),
  };
}
async function cambiarReserva(usuario, id, estado) {
  if (!['confirmada', 'cancelada'].includes(estado))
    throw new ErrorHttp(400, 'Selecciona confirmar o cancelar la reserva');
  return {
    reserva: reserva(
      await modelo.cambiarReserva(usuario, id, estado, esFuturo),
    ),
  };
}
module.exports = {
  ahoraChile,
  validarHorario,
  horario,
  listarDisponibilidad,
  guardarDisponibilidad,
  eliminarDisponibilidad,
  listarReservas,
  crearReserva,
  cambiarReserva,
};

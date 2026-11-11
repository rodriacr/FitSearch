const modelo = require('../models/agenda.model');
const chats = require('./chat.service');
const avisos = require('./aviso.service');
const ErrorHttp = require('../utils/ErrorHttp');
const { sumarDias, lunesDeLaSemana } = require('../utils/fechaChile');
const { agenda: reglas } = require('../../../shared/reglas.json');

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
      ...(r.disponibilidad.profesional.especialidad && { especialidad: r.disponibilidad.profesional.especialidad }),
    },
    usuario: { id: r.usuario.id, nombre: r.usuario.nombre },
    modalidad: r.modalidad ?? null,
    primeraVisita: r.primeraVisita ?? null,
    canceladaPor: r.canceladaPor ?? null,
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
  const bloque = await modelo.guardarDisponibilidad(usuarioId, id, validarHorario(datos));
  // Un horario nuevo puede ser la hora que alguien esperaba («Avísame si se libera una hora»).
  if (!id) avisos.avisarHoraLiberada(bloque.profesionalId);
  return { horario: horario(bloque) };
}
// "09:30" → 570 minutos y al revés, para recorrer una serie de bloques.
const aMinutos = (hora) => Number(hora.slice(0, 2)) * 60 + Number(hora.slice(3, 5));
const aHora = (minutos) => `${String(Math.floor(minutos / 60)).padStart(2, '0')}:${String(minutos % 60).padStart(2, '0')}`;
// Serie de bloques de igual duración entre dos horas del mismo día. Lo que no alcanza para un bloque completo se ignora.
async function guardarSerie(usuarioId, { fecha, horaInicio, horaFin, duracion }, ahora = new Date()) {
  if (!reglas.duraciones.includes(Number(duracion)))
    throw new ErrorHttp(400, `Elige una duración de ${reglas.duraciones.join(', ')} minutos`);
  validarHorario({ fecha, horaInicio, horaFin }, ahora);
  const bloques = [];
  for (let inicio = aMinutos(horaInicio); inicio + Number(duracion) <= aMinutos(horaFin); inicio += Number(duracion)) {
    bloques.push(validarHorario({ fecha, horaInicio: aHora(inicio), horaFin: aHora(inicio + Number(duracion)) }, ahora));
  }
  if (!bloques.length)
    throw new ErrorHttp(400, 'Entre esas horas no cabe un bloque completo de esa duración');
  if (bloques.length > reglas.serie.maxBloques)
    throw new ErrorHttp(400, `Publica hasta ${reglas.serie.maxBloques} bloques de una vez`);
  const { creados, omitidos } = await modelo.guardarSerie(usuarioId, bloques);
  if (creados.length) avisos.avisarHoraLiberada(creados[0].profesionalId);
  return {
    horarios: creados.map(horario),
    omitidos: omitidos.map((b) => ({ horaInicio: b.horaInicio.toISOString().slice(11, 16), horaFin: b.horaFin.toISOString().slice(11, 16) })),
  };
}
const eliminarDisponibilidad = (usuarioId, id) =>
  modelo.eliminarDisponibilidad(usuarioId, id);
async function listarReservas(usuario) {
  const filas = await modelo.listarReservas(usuario);
  // Aviso de mensaje nuevo (FS-HU-31): mensajes sin leer del chat con esa persona (uno por usuario y profesional).
  const noLeidos = filas.length ? await chats.noLeidosPorPareja(usuario) : new Map();
  return {
    reservas: filas.map((r) => ({ ...reserva(r), mensajesNoLeidos: noLeidos.get(`${r.usuario.id}-${r.disponibilidad.profesional.id}`) || 0 })),
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
  if (datos.modalidad !== undefined && !['presencial', 'online'].includes(datos.modalidad))
    throw new ErrorHttp(400, 'Elige si te atenderás presencial u online', { modalidad: 'Elige si te atenderás presencial u online' });
  if (datos.primeraVisita !== undefined && typeof datos.primeraVisita !== 'boolean')
    throw new ErrorHttp(400, 'Indica si es tu primera visita', { primeraVisita: 'Indica si es tu primera visita' });
  const creada = await modelo.crearReserva(
    usuarioId,
    { ...datos, mensaje: datos.mensaje.trim() },
    esFuturo,
  );
  avisos.avisarReservaCreada(creada.id);
  return { reserva: reserva(creada) };
}
async function cambiarReserva(usuario, id, estado) {
  if (!['confirmada', 'cancelada'].includes(estado))
    throw new ErrorHttp(400, 'Selecciona confirmar o cancelar la reserva');
  const cambiada = await modelo.cambiarReserva(usuario, id, estado, esFuturo);
  avisos.avisarReservaCambiada(cambiada.id);
  // Una cancelación libera una hora futura: se avisa a quienes la esperaban.
  if (estado === 'cancelada') avisos.avisarHoraLiberada(cambiada.disponibilidad.profesional.id);
  return { reserva: reserva(cambiada) };
}

// ---------- Calendario semanal y fechas bloqueadas (mejoras del 09-11-2026) ----------
const esFecha = (fecha) => {
  if (typeof fecha !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return false;
  const d = new Date(`${fecha}T00:00:00Z`);
  return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === fecha;
};
const fechaDb = (fecha) => new Date(`${fecha}T00:00:00Z`);
const bloqueo = (b) => ({
  id: b.id,
  fechaInicio: b.fechaInicio.toISOString().slice(0, 10),
  fechaFin: b.fechaFin.toISOString().slice(0, 10),
  motivo: b.motivo ?? null,
});

// Semana de lunes a domingo que contiene "desde" (por defecto, la actual en Chile).
async function semana(usuarioId, desde, ahora = new Date()) {
  const hoy = ahoraChile(ahora);
  if (desde !== undefined && !esFecha(desde)) throw new ErrorHttp(400, 'Indica una fecha válida (AAAA-MM-DD)');
  const lunes = lunesDeLaSemana(desde || hoy.fecha);
  const domingo = sumarDias(lunes, 6);
  const { bloques, bloqueos, enEspera, modalidad } = await modelo.semana(usuarioId, fechaDb(lunes), fechaDb(domingo));
  const cerrados = bloqueos.map(bloqueo);
  return {
    desde: lunes,
    hasta: domingo,
    hoy: hoy.fecha,
    ahora: hoy.hora,
    zonaHoraria: 'America/Santiago',
    modalidad,
    listaEspera: enEspera,
    bloqueos: cerrados,
    horarios: bloques.map((b) => {
      const activa = b.reservas[0];
      const base = horario(b);
      return {
        id: base.id,
        fecha: base.fecha,
        horaInicio: base.horaInicio,
        horaFin: base.horaFin,
        pasado: !esFuturo(base, hoy),
        bloqueado: cerrados.some((c) => c.fechaInicio <= base.fecha && c.fechaFin >= base.fecha),
        ...(base.conHistorial && { conHistorial: true }),
        ...(base.retirado && { retirado: true }),
        estado: activa ? activa.estado : 'libre',
        reserva: activa ? {
          id: activa.id,
          usuario: activa.usuario,
          mensaje: activa.mensaje,
          modalidad: activa.modalidad ?? null,
          primeraVisita: activa.primeraVisita ?? null,
        } : null,
      };
    }),
  };
}

function validarBloqueo({ fechaInicio, fechaFin, motivo }, ahora = new Date()) {
  if (!esFecha(fechaInicio) || !esFecha(fechaFin))
    throw new ErrorHttp(400, 'Indica fechas válidas para el bloqueo');
  if (fechaFin < fechaInicio)
    throw new ErrorHttp(400, 'La fecha de término debe ser igual o posterior a la de inicio');
  if (fechaInicio < ahoraChile(ahora).fecha)
    throw new ErrorHttp(400, 'Bloquea fechas desde hoy en adelante');
  const dias = (fechaDb(fechaFin) - fechaDb(fechaInicio)) / 86400000 + 1;
  if (dias > reglas.bloqueo.maxDias)
    throw new ErrorHttp(400, `Bloquea hasta ${reglas.bloqueo.maxDias} días seguidos`);
  const texto = typeof motivo === 'string' ? motivo.trim() : '';
  if (texto.length > reglas.bloqueo.motivo.max)
    throw new ErrorHttp(400, `El motivo admite hasta ${reglas.bloqueo.motivo.max} caracteres`);
  return { fechaInicio: fechaDb(fechaInicio), fechaFin: fechaDb(fechaFin), motivo: texto || null };
}
async function listarBloqueos(usuarioId, ahora = new Date()) {
  return { bloqueos: (await modelo.listarBloqueos(usuarioId, fechaDb(ahoraChile(ahora).fecha))).map(bloqueo) };
}
async function crearBloqueo(usuarioId, datos, ahora = new Date()) {
  return { bloqueo: bloqueo(await modelo.crearBloqueo(usuarioId, validarBloqueo(datos, ahora))) };
}
async function eliminarBloqueo(usuarioId, id, ahora = new Date()) {
  const resultado = await modelo.eliminarBloqueo(usuarioId, id, fechaDb(ahoraChile(ahora).fecha));
  if (resultado.liberaHoras) avisos.avisarHoraLiberada(resultado.profesionalId);
  return { id };
}
module.exports = {
  ahoraChile,
  validarHorario,
  validarBloqueo,
  horario,
  esFuturo,
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

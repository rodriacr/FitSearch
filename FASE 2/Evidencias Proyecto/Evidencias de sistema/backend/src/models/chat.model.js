// Chat entre un usuario y un profesional (FS-HU-31): uno por pareja, con los mensajes de todas sus reservas.
const prisma = require('./prisma');

const persona = { select: { id: true, nombre: true } };
const conPartes = {
  usuario: persona,
  profesional: { select: { id: true, usuarioId: true, especialidad: true, usuario: { select: { nombre: true } } } },
};
const seleccionMensaje = { id: true, autorId: true, texto: true, leido: true, fechaCreacion: true };

function buscar(id) {
  return prisma.chatCita.findUnique({ where: { id }, include: conPartes });
}

// Los dos participantes de una reserva, para abrir su chat desde Mis citas o la agenda.
function participantesDeReserva(reservaId) {
  return prisma.reserva.findUnique({
    where: { id: reservaId },
    select: { usuarioId: true, disponibilidad: { select: { profesional: { select: { id: true, usuarioId: true } } } } },
  });
}

function obtenerOCrear(usuarioId, profesionalId) {
  return prisma.chatCita.upsert({
    where: { usuarioId_profesionalId: { usuarioId, profesionalId } },
    create: { usuarioId, profesionalId },
    update: {},
    select: { id: true },
  });
}

// Parejas con al menos una reserva de la cuenta (como usuario o como profesional). Cada una tiene su chat.
async function parejasDe(usuario) {
  const where = usuario.rol === 'profesional'
    ? { disponibilidad: { profesional: { usuarioId: usuario.id } } }
    : { usuarioId: usuario.id };
  const filas = await prisma.reserva.findMany({ where, select: { usuarioId: true, disponibilidad: { select: { profesionalId: true } } } });
  const parejas = new Map(filas.map((f) => [`${f.usuarioId}-${f.disponibilidad.profesionalId}`, { usuarioId: f.usuarioId, profesionalId: f.disponibilidad.profesionalId }]));
  return [...parejas.values()];
}

// Asegura que cada pareja tenga su chat (las reservas anteriores a FS-HU-31 no lo tenían) y los devuelve con sus partes.
async function chatsDe(usuario) {
  const parejas = await parejasDe(usuario);
  if (parejas.length) await prisma.chatCita.createMany({ data: parejas, skipDuplicates: true });
  const where = usuario.rol === 'profesional' ? { profesional: { usuarioId: usuario.id } } : { usuarioId: usuario.id };
  return prisma.chatCita.findMany({ where, include: conPartes });
}

// Mensajes visibles para quien consulta: los posteriores al último que eliminó (desdeId).
function mensajes(chatId, desdeId = 0) {
  return prisma.mensajeCita.findMany({ where: { chatId, id: { gt: desdeId } }, select: seleccionMensaje, orderBy: { id: 'asc' } });
}

function ultimoMensaje(chatId, desdeId = 0) {
  return prisma.mensajeCita.findFirst({ where: { chatId, id: { gt: desdeId } }, select: seleccionMensaje, orderBy: { id: 'desc' } });
}

function noLeidos(chatId, lectorId, desdeId = 0) {
  return prisma.mensajeCita.count({ where: { chatId, autorId: { not: lectorId }, leido: false, id: { gt: desdeId } } });
}

// Reservas de la pareja (aparecen como avisos dentro del historial), sin las anteriores a que la persona eliminara el chat.
function reservasDePareja(usuarioId, profesionalId, desde = null) {
  return prisma.reserva.findMany({
    where: { usuarioId, disponibilidad: { profesionalId }, ...(desde && { fechaCreacion: { gt: desde } }) },
    select: { id: true, estado: true, mensaje: true, fechaCreacion: true, disponibilidad: { select: { fecha: true, horaInicio: true, horaFin: true } } },
    orderBy: { id: 'asc' },
  });
}

function crearMensaje(chatId, autorId, texto) {
  return prisma.mensajeCita.create({ data: { chatId, autorId, texto }, select: seleccionMensaje });
}

function marcarLeidos(chatId, lectorId) {
  return prisma.mensajeCita.updateMany({ where: { chatId, autorId: { not: lectorId }, leido: false }, data: { leido: true } });
}

// Elimina el chat solo para un lado: guarda hasta qué mensaje y desde cuándo. Si los dos lo eliminaron, los mensajes que
// ninguno de los dos puede ver se borran de la base.
async function eliminarPara(chatId, lado) {
  return prisma.$transaction(async (tx) => {
    const ultimo = await tx.mensajeCita.findFirst({ where: { chatId }, select: { id: true }, orderBy: { id: 'desc' } });
    const datos = lado === 'usuario'
      ? { borradoUsuarioHasta: ultimo?.id ?? 0, borradoUsuarioEn: new Date() }
      : { borradoProfesionalHasta: ultimo?.id ?? 0, borradoProfesionalEn: new Date() };
    const chat = await tx.chatCita.update({ where: { id: chatId }, data: datos });
    if (chat.borradoUsuarioEn && chat.borradoProfesionalEn) {
      await tx.mensajeCita.deleteMany({ where: { chatId, id: { lte: Math.min(chat.borradoUsuarioHasta, chat.borradoProfesionalHasta) } } });
    }
    return chat;
  });
}

// Mensajes sin leer de la otra persona, en total (aviso de la campana) y por pareja (Mis citas).
async function noLeidosDe(usuario) {
  const chats = await chatsVisibles(usuario);
  return chats.reduce((suma, c) => suma + c.noLeidos, 0);
}
async function chatsVisibles(usuario) {
  const where = usuario.rol === 'profesional' ? { profesional: { usuarioId: usuario.id } } : { usuarioId: usuario.id };
  const chats = await prisma.chatCita.findMany({ where, select: { id: true, usuarioId: true, profesionalId: true, borradoUsuarioHasta: true, borradoProfesionalHasta: true } });
  return Promise.all(chats.map(async (c) => ({
    ...c,
    noLeidos: await noLeidos(c.id, usuario.id, usuario.rol === 'profesional' ? c.borradoProfesionalHasta : c.borradoUsuarioHasta),
  })));
}

module.exports = {
  buscar, participantesDeReserva, obtenerOCrear, chatsDe, mensajes, ultimoMensaje, noLeidos, reservasDePareja,
  crearMensaje, marcarLeidos, eliminarPara, noLeidosDe, chatsVisibles,
};

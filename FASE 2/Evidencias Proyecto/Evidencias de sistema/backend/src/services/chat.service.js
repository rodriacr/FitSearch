// Chat entre un usuario y un profesional (FS-HU-31; decisión del PO del 09-11-2026). Hay uno por pareja, con el historial
// de todas sus reservas, y sigue disponible aunque una reserva se cancele. Solo los dos participantes lo ven: para cualquier
// otra cuenta «no existe» (404). Cada uno puede eliminarlo para sí; si el otro vuelve a escribir, reaparece con lo nuevo.
const modelo = require('../models/chat.model');
const ErrorHttp = require('../utils/ErrorHttp');
const { mensajesReserva: reglas } = require('../../../shared/reglas.json');

const noExiste = () => new ErrorHttp(404, 'No encontramos esta conversación');
const dia = (fecha) => fecha.toISOString().slice(0, 10);
const hora = (valor) => valor.toISOString().slice(11, 16);

// Lado de la cuenta en el chat ('usuario' o 'profesional'), o null si no participa. Manda el rol de la sesión.
function ladoEn(chat, usuario) {
  if (!chat) return null;
  if (usuario.rol === 'usuario' && chat.usuarioId === usuario.id) return 'usuario';
  if (usuario.rol === 'profesional' && chat.profesional.usuarioId === usuario.id) return 'profesional';
  return null;
}
const corte = (chat, lado) => (lado === 'usuario'
  ? { hasta: chat.borradoUsuarioHasta, en: chat.borradoUsuarioEn }
  : { hasta: chat.borradoProfesionalHasta, en: chat.borradoProfesionalEn });

// Con quién se conversa, visto desde quien consulta.
const con = (chat, lado) => (lado === 'profesional'
  ? { nombre: chat.usuario.nombre, detalle: 'Cliente', clienteId: chat.usuario.id }
  : { nombre: chat.profesional.usuario.nombre, detalle: chat.profesional.especialidad, profesionalId: chat.profesional.id });

const formatear = (m, lectorId) => ({ id: m.id, texto: m.texto, fecha: m.fechaCreacion.toISOString(), propio: m.autorId === lectorId, leido: m.leido });
const reserva = (r) => ({
  id: r.id, estado: r.estado, mensaje: r.mensaje, fecha: r.fechaCreacion.toISOString(),
  cita: { fecha: dia(r.disponibilidad.fecha), horaInicio: hora(r.disponibilidad.horaInicio), horaFin: hora(r.disponibilidad.horaFin) },
});

async function listar(usuario) {
  const chats = await modelo.chatsDe(usuario);
  const lado = usuario.rol === 'profesional' ? 'profesional' : 'usuario';
  const items = await Promise.all(chats.map(async (chat) => {
    const { hasta, en } = corte(chat, lado);
    const [ultimo, noLeidos, reservas] = await Promise.all([
      modelo.ultimoMensaje(chat.id, hasta),
      modelo.noLeidos(chat.id, usuario.id, hasta),
      modelo.reservasDePareja(chat.usuarioId, chat.profesionalId, en),
    ]);
    // Un chat eliminado no aparece hasta que haya algo nuevo (un mensaje o una reserva).
    if (en && !ultimo && !reservas.length) return null;
    const ultimaReserva = reservas.at(-1);
    const actividad = [ultimo?.fechaCreacion, ultimaReserva?.fechaCreacion].filter(Boolean).sort((a, b) => b - a)[0] || chat.fechaCreacion;
    return {
      id: chat.id,
      con: con(chat, lado),
      ultimo: ultimo ? formatear(ultimo, usuario.id) : null,
      ultimaCita: ultimaReserva ? { ...reserva(ultimaReserva).cita, estado: ultimaReserva.estado } : null,
      noLeidos,
      actividad: actividad.toISOString(),
    };
  }));
  return { chats: items.filter(Boolean).sort((a, b) => b.actividad.localeCompare(a.actividad)) };
}

async function participante(usuario, chatId) {
  const chat = await modelo.buscar(chatId);
  const lado = ladoEn(chat, usuario);
  if (!lado) throw noExiste();
  return { chat, lado };
}

// El chat completo: mensajes y avisos de cada reserva, sin lo que la persona eliminó. Al abrirlo quedan leídos.
async function abrir(usuario, chatId) {
  const { chat, lado } = await participante(usuario, chatId);
  const { hasta, en } = corte(chat, lado);
  await modelo.marcarLeidos(chat.id, usuario.id);
  const [mensajes, reservas] = await Promise.all([
    modelo.mensajes(chat.id, hasta),
    modelo.reservasDePareja(chat.usuarioId, chat.profesionalId, en),
  ]);
  return {
    chat: { id: chat.id, con: con(chat, lado), reservas: reservas.map(reserva) },
    mensajes: mensajes.map((m) => formatear(m, usuario.id)),
  };
}

// Desde una reserva (Mis citas, la agenda, la ficha): el chat de esa pareja, creado si aún no existía.
async function deReserva(usuario, reservaId) {
  const r = await modelo.participantesDeReserva(reservaId);
  const { profesional } = r?.disponibilidad || {};
  const participa = r && ((usuario.rol === 'usuario' && r.usuarioId === usuario.id)
    || (usuario.rol === 'profesional' && profesional.usuarioId === usuario.id));
  if (!participa) throw noExiste();
  return { id: (await modelo.obtenerOCrear(r.usuarioId, profesional.id)).id };
}

async function enviar(usuario, chatId, texto) {
  const limpio = typeof texto === 'string' ? texto.trim() : '';
  if (limpio.length < reglas.texto.min || limpio.length > reglas.texto.max) {
    throw new ErrorHttp(400, `Escribe un mensaje de hasta ${reglas.texto.max} caracteres`, { texto: `Escribe un mensaje de hasta ${reglas.texto.max} caracteres` });
  }
  const { chat } = await participante(usuario, chatId);
  return { mensaje: formatear(await modelo.crearMensaje(chat.id, usuario.id, limpio), usuario.id) };
}

async function eliminar(usuario, chatId) {
  const { chat, lado } = await participante(usuario, chatId);
  await modelo.eliminarPara(chat.id, lado);
  return { id: chat.id };
}

async function noLeidos(usuario) {
  return { total: await modelo.noLeidosDe(usuario) };
}

// Mis citas: mensajes sin leer del chat de cada reserva (la misma cifra en todas las reservas de una pareja).
async function noLeidosPorPareja(usuario) {
  const chats = await modelo.chatsVisibles(usuario);
  return new Map(chats.map((c) => [`${c.usuarioId}-${c.profesionalId}`, c.noLeidos]));
}

module.exports = { listar, abrir, deReserva, enviar, eliminar, noLeidos, noLeidosPorPareja };

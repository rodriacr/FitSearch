// Asistente IA del usuario (FS-HU-07, DAS D33): conversaciones con historial propio, límite diario de mensajes y
// tolerancia a fallos del proveedor (QS2). Si el proveedor falla, no se guarda nada y la persona puede reintentar.
// FS-HU-08 (D34): cada respuesta guarda la especialidad recomendada (o null) para mostrarla al reabrir la conversación.
const { asistente: reglas } = require('../../../shared/reglas.json');
const { ia } = require('../config/env');
const modelo = require('../models/asistente.model');
const proveedor = require('./proveedorIa.service');
const ErrorHttp = require('../utils/ErrorHttp');

const noEncontrada = () => new ErrorHttp(404, 'No encontramos esta conversación');

// Día de hoy en Chile ('AAAA-MM-DD'): el límite diario se reinicia a medianoche de Santiago.
function fechaEnChile(ahora = new Date()) {
  const partes = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago', year: 'numeric', month: '2-digit', day: '2-digit' })
    .formatToParts(ahora);
  const p = Object.fromEntries(partes.map(({ type, value }) => [type, value]));
  return `${p.year}-${p.month}-${p.day}`;
}

async function restantesHoy(usuarioId, ahora = new Date()) {
  const enviados = await modelo.usoDelDia(usuarioId, fechaEnChile(ahora));
  return Math.max(ia.mensajesPorDia - enviados, 0);
}

async function exigirCupo(usuarioId, ahora) {
  const restantes = await restantesHoy(usuarioId, ahora);
  if (restantes <= 0) {
    throw new ErrorHttp(429, `Llegaste al límite de ${ia.mensajesPorDia} mensajes de hoy. Vuelve a conversar mañana.`);
  }
  return restantes;
}

const mensaje = ({ id, remitente, contenido, especialidad = null, fecha }) => ({ id, remitente, contenido, especialidad, fecha });
const resumenConversacion = ({ id, titulo, fijada, fechaInicio, fechaActualizacion, mensajes = [] }) => ({
  id, titulo, fijada, fechaInicio, fechaActualizacion,
  vistaPrevia: mensajes[0] ? proveedor.resumir(mensajes[0].contenido, reglas.vistaPrevia.max) : '',
});
const datosConversacion = ({ id, titulo, fijada, fechaInicio, fechaActualizacion }) => ({ id, titulo, fijada, fechaInicio, fechaActualizacion });

async function estado(usuarioId) {
  return { modo: proveedor.modo(), limiteDiario: ia.mensajesPorDia, restantesHoy: await restantesHoy(usuarioId) };
}

async function listar(usuarioId) {
  const filas = await modelo.listarConversaciones(usuarioId, reglas.conversacionesListadas);
  return { conversaciones: filas.map(resumenConversacion) };
}

async function obtener(usuarioId, id) {
  const conversacion = await modelo.obtenerConversacion(id, usuarioId);
  if (!conversacion) throw noEncontrada();
  return { conversacion: datosConversacion(conversacion), mensajes: conversacion.mensajes.map(mensaje) };
}

// Primer mensaje: se responde y recién entonces se crea la conversación, con el mensaje como título.
async function iniciar(usuarioId, texto, ahora = new Date()) {
  const restantes = await exigirCupo(usuarioId, ahora);
  const { contenido, especialidad } = await proveedor.responder([{ remitente: 'usuario', contenido: texto }]);
  const creada = await modelo.crearConversacion(usuarioId, proveedor.resumir(texto, reglas.titulo.max), [
    { remitente: 'usuario', contenido: texto, fecha: ahora },
    { remitente: 'asistente', contenido, especialidad, fecha: new Date() },
  ]);
  await modelo.registrarUso(usuarioId, fechaEnChile(ahora));
  return { conversacion: datosConversacion(creada), mensajes: creada.mensajes.map(mensaje), restantesHoy: restantes - 1 };
}

async function enviar(usuarioId, id, texto, ahora = new Date()) {
  const conversacion = await modelo.obtenerConversacion(id, usuarioId);
  if (!conversacion) throw noEncontrada();
  const restantes = await exigirCupo(usuarioId, ahora);
  const historial = await modelo.ultimosMensajes(id, reglas.historialEnviado - 1);
  const { contenido, especialidad } = await proveedor.responder([...historial, { remitente: 'usuario', contenido: texto }]);
  const guardados = await modelo.agregarMensajes(id, [
    { remitente: 'usuario', contenido: texto, fecha: ahora },
    { remitente: 'asistente', contenido, especialidad, fecha: new Date() },
  ]);
  await modelo.registrarUso(usuarioId, fechaEnChile(ahora));
  return { mensajes: guardados.map(mensaje), restantesHoy: restantes - 1 };
}

async function fijar(usuarioId, id, fijada) {
  const conversacion = await modelo.obtenerConversacion(id, usuarioId);
  if (!conversacion) throw noEncontrada();
  if (fijada && !conversacion.fijada && (await modelo.contarFijadas(usuarioId)) >= reglas.fijadasMax) {
    throw new ErrorHttp(409, `Puedes fijar hasta ${reglas.fijadasMax} conversaciones. Desfija una para fijar esta.`);
  }
  await modelo.fijar(id, usuarioId, fijada);
  return { conversacion: { ...datosConversacion(conversacion), fijada } };
}

async function eliminar(usuarioId, id) {
  const { count } = await modelo.eliminar(id, usuarioId);
  if (!count) throw noEncontrada();
}

module.exports = { estado, listar, obtener, iniciar, enviar, fijar, eliminar, fechaEnChile };

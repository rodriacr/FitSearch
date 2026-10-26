// Asistente IA del usuario (FS-HU-07, DAS D33): conversaciones con historial propio, límite diario de mensajes y
// tolerancia a fallos del proveedor (QS2). Si el proveedor falla, no se guarda nada y la persona puede reintentar.
// FS-HU-08 (D34): cada respuesta guarda la especialidad recomendada (o null) para mostrarla al reabrir la conversación.
// FS-HU-09: si la persona pide agregar alimentos, se registran en sus comidas y la respuesta guarda lo agregado.
const { asistente: reglas } = require('../../../shared/reglas.json');
const { ia } = require('../config/env');
const modelo = require('../models/asistente.model');
const proveedor = require('./proveedorIa.service');
const comidas = require('./comida.service');
const { fechaEnChile } = require('../utils/fechaChile');
const ErrorHttp = require('../utils/ErrorHttp');

const noEncontrada = () => new ErrorHttp(404, 'No encontramos esta conversación');

async function restantesHoy(usuarioId, ahora = new Date()) {
  const enviados = await modelo.usoDelDia(usuarioId, fechaEnChile(ahora));
  return Math.max(ia.mensajesPorDia - enviados, 0);
}

// El mensaje se reserva antes de llamar al proveedor y la reserva es atómica, así que varias solicitudes simultáneas no
// pueden pasarse del límite. Si el proveedor o el guardado fallan, el cupo se devuelve y la persona puede reintentar.
async function conCupo(usuarioId, ahora, responderYGuardar) {
  const dia = fechaEnChile(ahora);
  if (!(await modelo.reservarUso(usuarioId, dia, ia.mensajesPorDia))) {
    throw new ErrorHttp(429, `Llegaste al límite de ${ia.mensajesPorDia} mensajes de hoy. Vuelve a conversar mañana.`);
  }
  try {
    return await responderYGuardar();
  } catch (error) {
    try {
      await modelo.liberarUso(usuarioId, dia);
    } catch {
      // Si tampoco se puede devolver el cupo, la persona debe ver el error original, no este.
    }
    throw error;
  }
}

const mensaje = ({ id, remitente, contenido, especialidad = null, comidasAgregadas = null, fecha }) => ({
  id, remitente, contenido, especialidad, comidasAgregadas, fecha,
});

// Respuesta del asistente. Si la persona pidió agregar alimentos (FS-HU-09), se registran en sus comidas de hoy y el
// backend arma el texto con lo agregado, sin una segunda consulta al proveedor; la red de seguridad se aplica igual.
async function responderConComidas(usuarioId, mensajes, ahora) {
  const respuesta = await proveedor.responder(mensajes);
  if (!respuesta.pedido) return { remitente: 'asistente', contenido: respuesta.contenido, especialidad: respuesta.especialidad, fecha: new Date() };
  const resultado = await comidas.agregarDesdeAsistente(usuarioId, respuesta.pedido, ahora);
  return {
    remitente: 'asistente',
    contenido: proveedor.agregarAvisos(mensajes.at(-1).contenido, comidas.textoAgregados(resultado)),
    especialidad: null,
    ...(resultado.agregados.length > 0 ? { comidasAgregadas: resultado.agregados } : {}),
    fecha: new Date(),
  };
}
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
  const creada = await conCupo(usuarioId, ahora, async () => {
    const respuesta = await responderConComidas(usuarioId, [{ remitente: 'usuario', contenido: texto }], ahora);
    return modelo.crearConversacion(usuarioId, proveedor.resumir(texto, reglas.titulo.max), [
      { remitente: 'usuario', contenido: texto, fecha: ahora },
      respuesta,
    ]);
  });
  return { conversacion: datosConversacion(creada), mensajes: creada.mensajes.map(mensaje), restantesHoy: await restantesHoy(usuarioId, ahora) };
}

async function enviar(usuarioId, id, texto, ahora = new Date()) {
  const conversacion = await modelo.obtenerConversacion(id, usuarioId);
  if (!conversacion) throw noEncontrada();
  const guardados = await conCupo(usuarioId, ahora, async () => {
    const historial = await modelo.ultimosMensajes(id, reglas.historialEnviado - 1);
    const respuesta = await responderConComidas(usuarioId, [...historial, { remitente: 'usuario', contenido: texto }], ahora);
    return modelo.agregarMensajes(id, [
      { remitente: 'usuario', contenido: texto, fecha: ahora },
      respuesta,
    ]);
  });
  return { mensajes: guardados.map(mensaje), restantesHoy: await restantesHoy(usuarioId, ahora) };
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

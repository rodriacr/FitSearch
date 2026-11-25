// Planes enviados por el chat (SC-46; DAS, D47). El profesional (por ejemplo, un nutricionista) envía un plan de comidas de
// un día o de una semana, o un plan de macronutrientes; llega como un mensaje con el plan adjunto y la persona lo guarda en
// sus planes con un botón, una sola vez. Los planes se validan igual que los que arma la persona (SC-44 y FS-HU-32).
const prisma = require('../models/prisma');
const modelo = require('../models/chat.model');
const planComida = require('./planComida.service');
const planAlimentacion = require('./planAlimentacion.service');
const { formatear } = require('./chat.service');
const avisos = require('./aviso.service');
const ErrorHttp = require('../utils/ErrorHttp');

const MAX_NOTA = 500;
const noExiste = () => new ErrorHttp(404, 'No encontramos esta conversación');

async function participante(usuario, chatId) {
  const chat = await modelo.buscar(chatId);
  if (!chat) throw noExiste();
  if (usuario.rol === 'usuario' && chat.usuarioId === usuario.id) return { chat, lado: 'usuario' };
  if (usuario.rol === 'profesional' && chat.profesional.usuarioId === usuario.id) return { chat, lado: 'profesional' };
  throw noExiste();
}

// Vista de un plan de comidas para mostrarlo en el chat: la misma forma que la lista de planes, con el aporte de cada línea.
async function vistaPlanComidas(plan) {
  const ids = [...new Set(plan.items.filter((i) => i.alimentoId).map((i) => i.alimentoId))];
  const alimentos = await prisma.alimento.findMany({ where: { id: { in: ids } } });
  const porId = new Map(alimentos.map((a) => [a.id, a]));
  const vista = planComida.formatear({
    id: 0, nombre: plan.nombre, tipo: plan.tipo, nota: plan.nota, origen: 'profesional', enUso: false, profesional: null, fechaCreacion: new Date(),
    items: plan.items.map((i, n) => ({ id: n + 1, ...i, alimento: i.alimentoId ? porId.get(i.alimentoId) ?? null : null })),
  });
  return { nombre: vista.nombre, tipo: vista.tipo, nota: vista.nota, dias: vista.dias, caloriasPromedio: vista.caloriasPromedio };
}

async function enviar(usuario, chatId, { tipo, plan, texto }) {
  const { chat, lado } = await participante(usuario, chatId);
  if (lado !== 'profesional') throw new ErrorHttp(403, 'Solo el profesional puede enviar planes por el chat');
  const nota = typeof texto === 'string' ? texto.trim() : '';
  if (nota.length > MAX_NOTA) throw new ErrorHttp(400, `El mensaje puede tener hasta ${MAX_NOTA} caracteres`, { texto: `Usa hasta ${MAX_NOTA} caracteres` });
  let adjunto;
  if (tipo === 'comidas') {
    const datos = await planComida.normalizarPlan(plan);
    adjunto = { tipo: 'plan_comidas', plan: datos, vista: await vistaPlanComidas(datos) };
  } else if (tipo === 'macros') {
    const datos = planAlimentacion.datosPersonalizado(plan ?? {});
    adjunto = { tipo: 'plan_macros', plan: { nombre: datos.nombre, proteinas: datos.proteinasPct, carbohidratos: datos.carbohidratosPct, grasas: datos.grasasPct } };
  } else {
    throw new ErrorHttp(400, 'Elige qué plan quieres enviar', { tipo: 'Plan de comidas o plan de macronutrientes' });
  }
  const que = tipo === 'comidas' ? 'un plan de comidas' : 'un plan de macronutrientes';
  const mensaje = await prisma.mensajeCita.create({
    // Sin mensaje del profesional, el texto se arma solo (sirve para la lista de chats) y la tarjeta no lo repite.
    data: { chatId: chat.id, autorId: usuario.id, texto: nota || `Te envié ${que}: «${adjunto.plan.nombre}».`, adjunto: { ...adjunto, automatico: !nota } },
    select: modelo.seleccionMensaje,
  });
  if (chat.usuario?.avisosMensajesCorreo) avisos.avisarMensajeNuevo(chat.usuarioId, mensaje.id);
  return { mensaje: formatear(mensaje, usuario.id) };
}

// Un plan de macronutrientes con un nombre que ya existe se guarda como «Nombre (2)», «Nombre (3)»… (hasta 40 caracteres).
async function guardarMacros(usuarioId, plan) {
  for (let n = 1; n <= 9; n += 1) {
    const sufijo = n === 1 ? '' : ` (${n})`;
    const nombre = `${plan.nombre.slice(0, 40 - sufijo.length)}${sufijo}`;
    try {
      return await planAlimentacion.crearPersonalizado(usuarioId, { ...plan, nombre });
    } catch (error) {
      if (!(error instanceof ErrorHttp && error.estado === 409 && error.detalles?.nombre)) throw error;
    }
  }
  throw new ErrorHttp(409, 'Ya tienes varios planes con ese nombre; cambia el nombre de alguno');
}

async function guardar(usuario, chatId, mensajeId) {
  const { chat, lado } = await participante(usuario, chatId);
  if (lado !== 'usuario') throw new ErrorHttp(403, 'Solo la persona que recibió el plan puede guardarlo');
  const mensaje = await prisma.mensajeCita.findFirst({ where: { id: mensajeId, chatId: chat.id }, select: modelo.seleccionMensaje });
  if (!mensaje?.adjunto || mensaje.autorId === usuario.id) throw new ErrorHttp(404, 'No encontramos ese plan en la conversación');
  // Se reserva el mensaje antes de crear el plan, así dos pulsaciones seguidas no guardan dos copias.
  const { count } = await prisma.mensajeCita.updateMany({ where: { id: mensaje.id, guardadoEn: null }, data: { guardadoEn: new Date() } });
  if (!count) throw new ErrorHttp(409, 'Ya guardaste este plan');
  try {
    if (mensaje.adjunto.tipo === 'plan_comidas') {
      await planComida.crear(usuario.id, mensaje.adjunto.plan, { origen: 'profesional', profesionalId: chat.profesionalId });
    } else {
      await guardarMacros(usuario.id, mensaje.adjunto.plan);
    }
  } catch (error) {
    await prisma.mensajeCita.update({ where: { id: mensaje.id }, data: { guardadoEn: null } });
    throw error;
  }
  const actualizado = await prisma.mensajeCita.findUnique({ where: { id: mensaje.id }, select: modelo.seleccionMensaje });
  return { mensaje: formatear(actualizado, usuario.id), destino: mensaje.adjunto.tipo === 'plan_comidas' ? 'planes-comida' : 'plan' };
}

module.exports = { enviar, guardar };

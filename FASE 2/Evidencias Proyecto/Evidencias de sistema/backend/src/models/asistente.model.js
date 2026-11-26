// Acceso a datos de las conversaciones con el asistente IA (FS-HU-07). Toda consulta filtra por el dueño:
// una conversación ajena se comporta como inexistente.
const prisma = require('./prisma');

const CONVERSACION = { id: true, titulo: true, fijada: true, fechaInicio: true, fechaActualizacion: true };
const MENSAJE = {
  id: true, remitente: true, contenido: true, especialidad: true, comidasAgregadas: true, modalidad: true, criterio: true, resumenDia: true,
  valoracion: true, fecha: true,
};

// Historial con el último mensaje de cada conversación (para la vista previa): primero las fijadas, luego las recientes.
function listarConversaciones(usuarioId, limite) {
  return prisma.conversacion.findMany({
    where: { usuarioId },
    orderBy: [{ fijada: 'desc' }, { fechaActualizacion: 'desc' }, { id: 'desc' }],
    take: limite,
    select: { ...CONVERSACION, mensajes: { orderBy: [{ fecha: 'desc' }, { id: 'desc' }], take: 1, select: MENSAJE } },
  });
}

function obtenerConversacion(id, usuarioId) {
  return prisma.conversacion.findFirst({
    where: { id, usuarioId },
    select: { ...CONVERSACION, mensajes: { orderBy: [{ fecha: 'asc' }, { id: 'asc' }], select: MENSAJE } },
  });
}

// Últimos mensajes de una conversación, en orden cronológico, para dar contexto al proveedor de IA.
async function ultimosMensajes(conversacionId, cantidad) {
  const filas = await prisma.mensaje.findMany({
    where: { conversacionId },
    orderBy: [{ fecha: 'desc' }, { id: 'desc' }],
    take: cantidad,
    select: MENSAJE,
  });
  return filas.reverse();
}

// Límite diario: una fila por usuario con el día (en Chile, 'AAAA-MM-DD') y los mensajes enviados ese día. No guarda
// contenido, así que borrar una conversación no devuelve el cupo.
const comoDia = (fecha) => new Date(`${fecha}T00:00:00Z`);
async function usoDelDia(usuarioId, fecha) {
  const fila = await prisma.usoAsistente.findUnique({ where: { usuarioId } });
  return fila && fila.fecha.toISOString().slice(0, 10) === fecha ? fila.mensajes : 0;
}

const CONFLICTOS_AL_CREAR = new Set(['P2002', 'P2034']);

// Reserva un mensaje del día y devuelve si quedaba cupo. Cada paso es un solo UPDATE o INSERT con la condición en la
// misma sentencia, así que dos solicitudes simultáneas no pueden quedarse con el último cupo. Si el día cambió, el
// contador parte de nuevo en 1.
async function reservarUso(usuarioId, fecha, limite) {
  const dia = comoDia(fecha);
  const sumar = () => prisma.usoAsistente.updateMany({
    where: { usuarioId, fecha: dia, mensajes: { lt: limite } },
    data: { mensajes: { increment: 1 } },
  });
  if ((await sumar()).count) return true;
  // Solo se avanza de día: una solicitud que llegó tarde no debe reiniciar el contador del día nuevo.
  const { count } = await prisma.usoAsistente.updateMany({ where: { usuarioId, fecha: { lt: dia } }, data: { fecha: dia, mensajes: 1 } });
  if (count) return true;
  try {
    await prisma.usoAsistente.create({ data: { usuarioId, fecha: dia, mensajes: 1 } });
    return true;
  } catch (error) {
    // Otra solicitud creó la fila primero: se intenta sumar sobre ella, sin pasar el límite. MySQL lo informa como
    // clave duplicada (P2002) o, con varias inserciones simultáneas de la misma fila, como un deadlock en el que
    // descarta una de ellas (P2034); la fila de la que ganó queda igual.
    if (!CONFLICTOS_AL_CREAR.has(error.code)) throw error;
    return (await sumar()).count > 0;
  }
}

// Devuelve un mensaje reservado que no se respondió. Si ya cambió el día, no hay nada que devolver.
const liberarUso = (usuarioId, fecha) => prisma.usoAsistente.updateMany({
  where: { usuarioId, fecha: comoDia(fecha), mensajes: { gt: 0 } },
  data: { mensajes: { decrement: 1 } },
});

const contarFijadas = (usuarioId) => prisma.conversacion.count({ where: { usuarioId, fijada: true } });

// Guardar alimentos pedidos en el chat junto con los mensajes (FS-HU-09): todo se confirma o nada.
const enTransaccion = (trabajo) => prisma.$transaction(trabajo);

// La conversación nace con su primer mensaje y la respuesta: nunca quedan conversaciones vacías.
// `db` es la transacción en curso, si la hay.
function crearConversacion(usuarioId, titulo, mensajes, db = prisma) {
  return db.conversacion.create({
    data: { usuarioId, titulo, mensajes: { create: mensajes } },
    select: { ...CONVERSACION, mensajes: { orderBy: [{ fecha: 'asc' }, { id: 'asc' }], select: MENSAJE } },
  });
}

// Guarda el mensaje y la respuesta juntos y mueve la conversación al inicio del historial. Sin una transacción en curso
// (`db`), abre una propia.
async function agregarMensajes(conversacionId, mensajes, db) {
  if (!db) return prisma.$transaction((tx) => agregarMensajes(conversacionId, mensajes, tx));
  const creados = [];
  for (const datos of mensajes) creados.push(await db.mensaje.create({ data: { conversacionId, ...datos }, select: MENSAJE }));
  await db.conversacion.update({ where: { id: conversacionId }, data: { fechaActualizacion: mensajes.at(-1).fecha } });
  return creados;
}

const fijar = (id, usuarioId, fijada) => prisma.conversacion.updateMany({ where: { id, usuarioId }, data: { fijada } });

// Una respuesta del asistente en una conversación propia (SC-47); null si es ajena, de la persona o no existe.
const mensajeDelAsistente = (id, usuarioId) => prisma.mensaje.findFirst({
  where: { id, remitente: 'asistente', conversacion: { usuarioId } }, select: MENSAJE,
});
const actualizarMensaje = (id, datos) => prisma.mensaje.update({ where: { id }, data: datos, select: MENSAJE });

// Permiso para usar el perfil en el asistente (SC-47) y los datos que se usan con él: nunca el nombre, el correo ni el
// teléfono. La información de salud solo se lee si el permiso la incluye.
const permisoPerfil = (usuarioId) => prisma.usuario.findUnique({
  where: { id: usuarioId }, select: { permisoPerfilIa: true, permisoPerfilIaFecha: true },
});
const guardarPermisoPerfil = (usuarioId, permiso, fecha) => prisma.usuario.update({
  where: { id: usuarioId }, data: { permisoPerfilIa: permiso, permisoPerfilIaFecha: fecha },
  select: { permisoPerfilIa: true, permisoPerfilIaFecha: true },
});
const datosDelPerfil = (usuarioId, conSalud) => prisma.usuario.findUnique({
  where: { id: usuarioId },
  select: {
    perfil: { select: { pesoKg: true, alturaCm: true, edad: true, sexo: true, actividadFisica: true, objetivoPrincipal: true, comidasDia: true, horasSueno: true } },
    ...(conSalud && { informacionSalud: { select: { condicionesMedicas: true, tomaMedicamentos: true, medicamentos: true, alergias: true } } }),
  },
});
const eliminar = (id, usuarioId) => prisma.conversacion.deleteMany({ where: { id, usuarioId } });

module.exports = {
  listarConversaciones, obtenerConversacion, ultimosMensajes, usoDelDia, reservarUso, liberarUso, contarFijadas,
  enTransaccion, crearConversacion, agregarMensajes, fijar, eliminar, mensajeDelAsistente, actualizarMensaje, permisoPerfil,
  guardarPermisoPerfil, datosDelPerfil,
};

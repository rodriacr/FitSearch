// «Avísame si se libera una hora» (mejora del 09-11-2026). El usuario se anota con un profesional;
// cuando este publica un horario o se cancela una reserva futura, aviso.service le escribe una vez y lo saca de la lista.
const prisma = require('../models/prisma');
const profesionalModel = require('../models/profesional.model');
const ErrorHttp = require('../utils/ErrorHttp');

async function profesional(profesionalId, usuarioId) {
  const fila = await profesionalModel.existe(profesionalId);
  if (!fila) throw new ErrorHttp(404, 'No encontramos este profesional');
  if (fila.usuarioId === usuarioId) throw new ErrorHttp(403, 'No puedes esperar una hora contigo mismo');
  return fila;
}

async function estado(profesionalId, usuarioId) {
  await profesional(profesionalId, usuarioId);
  const fila = await prisma.listaEspera.findUnique({ where: { usuarioId_profesionalId: { usuarioId, profesionalId } } });
  return { enLista: Boolean(fila), desde: fila?.fechaCreacion.toISOString() ?? null };
}

async function anotar(profesionalId, usuarioId) {
  await profesional(profesionalId, usuarioId);
  const fila = await prisma.listaEspera.upsert({
    where: { usuarioId_profesionalId: { usuarioId, profesionalId } },
    create: { usuarioId, profesionalId },
    update: {},
  });
  return { enLista: true, desde: fila.fechaCreacion.toISOString() };
}

async function salir(profesionalId, usuarioId) {
  await profesional(profesionalId, usuarioId);
  await prisma.listaEspera.deleteMany({ where: { usuarioId, profesionalId } });
  return { enLista: false, desde: null };
}

module.exports = { estado, anotar, salir };

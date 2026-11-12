// Calificaciones y reseñas de profesionales (FS-HU-24).
const profesionalModel = require('../models/profesional.model');
const resenaModel = require('../models/resena.model');
const { resumirResenas, formatearResena } = require('./profesional.service');
const ErrorHttp = require('../utils/ErrorHttp');
const { fechaEnChile, horaEnChile } = require('../utils/fechaChile');
const { resena: reglas } = require('../../../shared/reglas.json');

async function profesionalExistente(profesionalId) {
  const profesional = await profesionalModel.existe(profesionalId);
  if (!profesional) throw new ErrorHttp(404, 'No encontramos este profesional');
  return profesional;
}

async function listar(profesionalId, usuarioId, pagina = 1, tipo = undefined) {
  await profesionalExistente(profesionalId);
  const { filas, total } = await resenaModel.listar(profesionalId, { pagina, limite: reglas.porPagina, tipo });
  return {
    resenas: filas.map((fila) => formatearResena(fila, usuarioId)),
    pagina,
    total,
    totalPaginas: Math.ceil(total / reglas.porPagina),
  };
}

const ahoraChile = (ahora = new Date()) => ({ fecha: fechaEnChile(ahora), hora: horaEnChile(ahora) });

// Crea la reseña del usuario o reemplaza la que ya tenía (una por profesional). Un comentario vacío no se guarda.
// Reseñas verificadas (09-11-2026): una reseña nueva exige una cita confirmada con el profesional cuya hora ya pasó.
async function guardar(profesionalId, usuario, { puntaje, comentario }) {
  const profesional = await profesionalExistente(profesionalId);
  if (profesional.usuarioId === usuario.id) throw new ErrorHttp(403, 'No puedes calificar tu propio perfil profesional');
  const [existente, cita] = await Promise.all([
    resenaModel.buscarDelUsuario(usuario.id, profesionalId),
    resenaModel.citaVerificable(usuario.id, profesionalId, ahoraChile()),
  ]);
  if (!existente && !cita) {
    throw new ErrorHttp(403, 'Podrás calificar a este profesional después de tu cita confirmada con él', { motivo: 'sin_cita' });
  }
  const reservaId = existente?.reservaId ? null : cita?.id ?? null;
  const { fila, creada } = await resenaModel.guardar(usuario.id, profesionalId, { puntaje, comentario: comentario || null, reservaId });
  return {
    creada,
    resena: formatearResena(fila, usuario.id),
    resumenResenas: resumirResenas(await resenaModel.distribucion(profesionalId)),
  };
}

async function eliminar(profesionalId, usuarioId) {
  await profesionalExistente(profesionalId);
  const { count } = await resenaModel.eliminar(usuarioId, profesionalId);
  if (!count) throw new ErrorHttp(404, 'Aún no has calificado a este profesional');
  return { resumenResenas: resumirResenas(await resenaModel.distribucion(profesionalId)) };
}

module.exports = { listar, guardar, eliminar, ahoraChile };

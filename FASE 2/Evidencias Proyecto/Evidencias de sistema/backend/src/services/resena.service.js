// Calificaciones y reseñas de profesionales (FS-HU-24).
const profesionalModel = require('../models/profesional.model');
const resenaModel = require('../models/resena.model');
const { resumirResenas, formatearResena } = require('./profesional.service');
const ErrorHttp = require('../utils/ErrorHttp');
const { resena: reglas } = require('../../../shared/reglas.json');

async function profesionalExistente(profesionalId) {
  const profesional = await profesionalModel.existe(profesionalId);
  if (!profesional) throw new ErrorHttp(404, 'No encontramos este profesional');
  return profesional;
}

async function listar(profesionalId, usuarioId, pagina = 1) {
  await profesionalExistente(profesionalId);
  const { filas, total } = await resenaModel.listar(profesionalId, { pagina, limite: reglas.porPagina });
  return {
    resenas: filas.map((fila) => formatearResena(fila, usuarioId)),
    pagina,
    total,
    totalPaginas: Math.ceil(total / reglas.porPagina),
  };
}

// Crea la reseña del usuario o reemplaza la que ya tenía (una por profesional). Un comentario vacío no se guarda.
async function guardar(profesionalId, usuario, { puntaje, comentario }) {
  const profesional = await profesionalExistente(profesionalId);
  if (profesional.usuarioId === usuario.id) throw new ErrorHttp(403, 'No puedes calificar tu propio perfil profesional');
  const { fila, creada } = await resenaModel.guardar(usuario.id, profesionalId, { puntaje, comentario: comentario || null });
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

module.exports = { listar, guardar, eliminar };

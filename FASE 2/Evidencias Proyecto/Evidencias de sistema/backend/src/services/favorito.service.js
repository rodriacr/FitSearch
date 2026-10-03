// Profesionales favoritos de cada usuario (FS-HU-23).
const profesionalModel = require('../models/profesional.model');
const favoritoModel = require('../models/favorito.model');
const { listar: listarProfesionales } = require('./profesional.service');
const ErrorHttp = require('../utils/ErrorHttp');

// Mismo formato de ficha que el directorio, filtrado a los favoritos del usuario.
const listar = (usuarioId, pagina = 1) => listarProfesionales({ usuarioId, soloFavoritosDe: usuarioId, orden: 'nombre', pagina });

async function agregar(usuarioId, profesionalId) {
  if (!(await profesionalModel.existe(profesionalId))) throw new ErrorHttp(404, 'No encontramos este profesional');
  await favoritoModel.agregar(usuarioId, profesionalId);
  return { profesionalId, esFavorito: true };
}

// Quitar un favorito que no existía no es un error: el resultado es el mismo.
async function quitar(usuarioId, profesionalId) {
  await favoritoModel.quitar(usuarioId, profesionalId);
  return { profesionalId, esFavorito: false };
}

module.exports = { listar, agregar, quitar };

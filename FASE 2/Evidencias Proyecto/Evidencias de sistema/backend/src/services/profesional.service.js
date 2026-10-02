const modelo = require('../models/profesional.model');

async function listar({ especialidad = '', comuna = '', pagina = 1 }) {
  const limite = 12;
  const filas = await modelo.listar({ especialidad, comuna, pagina, limite });
  return {
    profesionales: filas.slice(0, limite).map((fila) => ({
      id: fila.id, nombre: fila.usuario.nombre, especialidad: fila.especialidad,
      descripcion: fila.descripcion, ubicacionLat: Number(fila.ubicacionLat), ubicacionLng: Number(fila.ubicacionLng),
      establecimiento: fila.establecimiento ? { nombre: fila.establecimiento.nombre, direccion: fila.establecimiento.direccion } : null,
    })),
    pagina, hayMas: filas.length > limite,
  };
}

async function especialidades() { return { especialidades: await modelo.especialidades() }; }
module.exports = { listar, especialidades };

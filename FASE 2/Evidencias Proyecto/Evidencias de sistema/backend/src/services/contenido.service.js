// Contenido del administrador (FS-HU-30): especialidades, alimentos y establecimientos. La API usa `activo` en los tres
// catálogos (en la tabla de especialidades la columna se llama `activa`).
const modelo = require('../models/contenido.model');

const FORMATOS = {
  especialidades: ({ id, nombre, activa, enUso }) => ({ id, nombre, activo: activa, enUso }),
  alimentos: ({ id, nombre, sinonimos, calorias, proteinasG, carbohidratosG, grasasG, activo, enUso }) => ({
    id, nombre, sinonimos, calorias: Number(calorias), proteinasG: Number(proteinasG), carbohidratosG: Number(carbohidratosG),
    grasasG: Number(grasasG), activo, enUso,
  }),
  establecimientos: ({ id, nombre, categoria, comuna, direccion, ubicacionLat, ubicacionLng, activo, enUso }) => ({
    id, nombre, categoria, comuna, direccion, ubicacionLat: Number(ubicacionLat), ubicacionLng: Number(ubicacionLng), activo, enUso,
  }),
};
// Datos que se guardan de cada catálogo; el resto del cuerpo se ignora.
const CAMPOS = {
  especialidades: ['nombre'],
  alimentos: ['nombre', 'sinonimos', 'calorias', 'proteinasG', 'carbohidratosG', 'grasasG'],
  establecimientos: ['nombre', 'categoria', 'comuna', 'direccion', 'ubicacionLat', 'ubicacionLng'],
};
const datosDe = (catalogo, cuerpo) => Object.fromEntries(CAMPOS[catalogo].map((campo) => [campo, cuerpo[campo]]));
const elemento = (catalogo, fila) => ({ elemento: FORMATOS[catalogo](fila) });

async function listar(catalogo, parametros) {
  const { filas, total } = await modelo.listar(catalogo, parametros);
  return { resultados: filas.map(FORMATOS[catalogo]), total, pagina: parametros.pagina, totalPaginas: Math.ceil(total / parametros.limite) };
}
const crear = async (catalogo, cuerpo) => elemento(catalogo, await modelo.crear(catalogo, datosDe(catalogo, cuerpo)));
const actualizar = async (catalogo, id, cuerpo) => elemento(catalogo, await modelo.actualizar(catalogo, id, datosDe(catalogo, cuerpo)));
const cambiarEstado = async (catalogo, id, activo) => elemento(catalogo, await modelo.cambiarEstado(catalogo, id, activo));
const eliminar = (catalogo, id) => modelo.eliminar(catalogo, id);

module.exports = { listar, crear, actualizar, cambiarEstado, eliminar };

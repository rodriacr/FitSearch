// Directorio de centros de salud y gimnasios (FS-HU-25): listado con filtros por comuna y distancia, y ficha.
const modelo = require('../models/establecimiento.model');
const ErrorHttp = require('../utils/ErrorHttp');
const { profesionales: reglas } = require('../../../shared/reglas.json');

const redondear = (valor) => Math.round(Number(valor) * 10) / 10;

// MySQL entrega conteos como BigInt y coordenadas y distancias como Decimal.
function formatear(fila) {
  return {
    id: Number(fila.id),
    nombre: fila.nombre,
    categoria: fila.categoria,
    comuna: fila.comuna ?? null,
    direccion: fila.direccion,
    instagram: fila.instagram ?? null,
    ubicacionLat: Number(fila.ubicacionLat),
    ubicacionLng: Number(fila.ubicacionLng),
    distanciaKm: fila.distanciaKm === null || fila.distanciaKm === undefined ? null : redondear(fila.distanciaKm),
    totalProfesionales: Number(fila.totalProfesionales ?? 0),
  };
}

async function listar({ limite = reglas.porPagina, pagina = 1, ...filtros }) {
  const { filas, total } = await modelo.listar({ ...filtros, pagina, limite });
  return {
    establecimientos: filas.map(formatear),
    pagina,
    total,
    totalPaginas: Math.ceil(total / limite),
    hayMas: pagina * limite < total,
  };
}

// Un establecimiento desactivado por el administrador ya no tiene ficha: responde igual que uno inexistente.
async function ficha(id) {
  const fila = await modelo.buscarPorId(id);
  if (!fila) throw new ErrorHttp(404, 'No encontramos ese establecimiento');
  const { profesionales, ...datos } = fila;
  return {
    establecimiento: {
      ...formatear({ ...datos, distanciaKm: null, totalProfesionales: profesionales.length }),
      profesionales: profesionales.map((p) => ({
        id: p.id, nombre: p.usuario.nombre, especialidad: p.especialidad, modalidad: p.modalidad, verificado: p.verificado,
      })),
    },
  };
}

const filtros = async (categoria) => ({ comunas: await modelo.comunas(categoria) });

module.exports = { listar, ficha, filtros };

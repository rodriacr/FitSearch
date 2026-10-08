// Directorio de profesionales: listado con búsqueda y filtros (FS-HU-03, FS-HU-05, FS-HU-22) y ficha individual.
const modelo = require('../models/profesional.model');
const resenaModel = require('../models/resena.model');
const ErrorHttp = require('../utils/ErrorHttp');
const { profesionales: reglas } = require('../../../shared/reglas.json');

const redondear = (valor, decimales = 1) => Math.round(Number(valor) * 10 ** decimales) / 10 ** decimales;

// MySQL entrega conteos como BigInt, promedios y coordenadas como Decimal y booleanos como 0/1.
function formatearFicha(fila) {
  const totalResenas = Number(fila.totalResenas);
  return {
    id: Number(fila.id),
    nombre: fila.nombre,
    especialidad: fila.especialidad,
    descripcion: fila.descripcion ?? null,
    comuna: fila.comuna ?? null,
    modalidad: fila.modalidad,
    verificado: Boolean(Number(fila.verificado)),
    ubicacionLat: Number(fila.ubicacionLat),
    ubicacionLng: Number(fila.ubicacionLng),
    establecimiento: fila.establecimientoNombre ? { nombre: fila.establecimientoNombre, direccion: fila.establecimientoDireccion } : null,
    calificacion: { promedio: totalResenas ? redondear(fila.promedio) : null, total: totalResenas },
    distanciaKm: fila.distanciaKm === null || fila.distanciaKm === undefined ? null : redondear(fila.distanciaKm),
    esFavorito: Boolean(Number(fila.esFavorito)),
  };
}

async function listar({ limite = reglas.porPagina, pagina = 1, ...filtros }) {
  const resultado = await modelo.listar({ ...filtros, pagina, limite });
  
  // Protección por si modelo.listar devuelve un array directo o un objeto vacío
  const filas = Array.isArray(resultado) ? resultado : (resultado?.filas || []);
  const total = Number(resultado?.total || filas.length);

  return {
    profesionales: filas.map(formatearFicha),
    pagina,
    total,
    totalPaginas: Math.ceil(total / limite),
    hayMas: pagina * limite < total,
  };
}

// Promedio, cantidad y cantidad por estrella a partir de la distribución de puntajes.
function resumirResenas(grupos) {
  const distribucion = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  for (const { puntaje, cantidad } of grupos) distribucion[puntaje] = cantidad;
  const total = Object.values(distribucion).reduce((suma, cantidad) => suma + cantidad, 0);
  const suma = Object.entries(distribucion).reduce((acumulado, [puntaje, cantidad]) => acumulado + Number(puntaje) * cantidad, 0);
  return { promedio: total ? redondear(suma / total) : null, total, distribucion };
}

// Nombre visible del autor de una reseña: nombre y la inicial del apellido ("Rodrigo C."), nunca el correo.
function nombrePublico(nombre) {
  const [primero, segundo] = nombre.trim().split(/\s+/);
  return segundo ? `${primero} ${segundo[0].toUpperCase()}.` : primero;
}

function formatearResena(fila, usuarioId) {
  return {
    id: fila.id,
    autor: nombrePublico(fila.usuario.nombre),
    puntaje: fila.puntaje,
    comentario: fila.comentario ?? null,
    fecha: fila.fechaActualizacion.toISOString(),
    propia: fila.usuarioId === usuarioId,
  };
}

// Solo las cuentas de usuario califican, y nadie puede calificar su propia ficha profesional.
const puedeResenar = (usuario, fila) => usuario.rol === 'usuario' && Number(fila.usuarioId) !== usuario.id;

async function ficha(id, usuario) {
  const fila = await modelo.buscarPorId(id, usuario.id);
  if (!fila) throw new ErrorHttp(404, 'No encontramos este profesional');
  const [grupos, propia] = await Promise.all([resenaModel.distribucion(id), resenaModel.buscarDelUsuario(usuario.id, id)]);
  return {
    profesional: formatearFicha(fila),
    resumenResenas: resumirResenas(grupos),
    miResena: propia ? formatearResena(propia, usuario.id) : null,
    puedeResenar: puedeResenar(usuario, fila),
  };
}

const filtros = () => modelo.filtros();

// ==========================================
// FUNCIONES DE CLAUDE (GESTIÓN DE FICHA PROPIA)
// ==========================================
const formatearFichaSimple = (fila) => fila && {
  especialidad: fila.especialidad,
  descripcion: fila.descripcion ?? '',
  ubicacionLat: Number(fila.ubicacionLat),
  ubicacionLng: Number(fila.ubicacionLng),
};

async function obtenerMiFicha(usuarioId) {
  return { ficha: formatearFichaSimple(await modelo.obtenerPorUsuario(usuarioId)) };
}

async function guardarMiFicha(usuarioId, datos) {
  return { ficha: formatearFichaSimple(await modelo.guardarFicha(usuarioId, datos)) };
}

module.exports = { 
  listar, 
  ficha, 
  filtros, 
  formatearFicha, 
  resumirResenas, 
  nombrePublico, 
  formatearResena,
  obtenerMiFicha,
  guardarMiFicha
};
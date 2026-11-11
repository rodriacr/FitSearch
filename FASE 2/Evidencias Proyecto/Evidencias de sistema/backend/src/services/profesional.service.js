// Directorio de profesionales: listado con búsqueda y filtros (FS-HU-03, FS-HU-05, FS-HU-22) y ficha individual.
const modelo = require('../models/profesional.model');
const resenaModel = require('../models/resena.model');
const ErrorHttp = require('../utils/ErrorHttp');
const { profesionales: reglas, agenda: reglasAgenda } = require('../../../shared/reglas.json');
const { fechaEnChile, horaEnChile, sumarDias } = require('../utils/fechaChile');

// Momento actual en Chile para calcular las horas libres: el día y los segundos desde la medianoche.
function ahoraEnChile(ahora = new Date()) {
  const hora = horaEnChile(ahora);
  return { hoy: fechaEnChile(ahora), hora, segundos: Number(hora.slice(0, 2)) * 3600 + Number(hora.slice(3, 5)) * 60 };
}
const lista = (valor) => {
  if (Array.isArray(valor)) return valor;
  if (typeof valor === 'string') { try { const leido = JSON.parse(valor); return Array.isArray(leido) ? leido : []; } catch { return []; } }
  return [];
};

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
    direccion: fila.direccion ?? null,
    modalidad: fila.modalidad,
    verificado: Boolean(Number(fila.verificado)),
    ubicacionLat: Number(fila.ubicacionLat),
    ubicacionLng: Number(fila.ubicacionLng),
    establecimiento: fila.establecimientoNombre ? { nombre: fila.establecimientoNombre, direccion: fila.establecimientoDireccion } : null,
    calificacion: { promedio: totalResenas ? redondear(fila.promedio) : null, total: totalResenas },
    distanciaKm: fila.distanciaKm === null || fila.distanciaKm === undefined ? null : redondear(fila.distanciaKm),
    esFavorito: Boolean(Number(fila.esFavorito)),
    // FS-HU-29 y precio referencial (09-11-2026). MySQL entrega JSON ya leído; por las dudas también se acepta texto.
    aniosExperiencia: fila.aniosExperiencia === null || fila.aniosExperiencia === undefined ? null : Number(fila.aniosExperiencia),
    formacion: lista(fila.formacion),
    atiendeA: lista(fila.atiendeA),
    registroSis: fila.registroSis ?? null,
    precioDesde: fila.precioDesde === null || fila.precioDesde === undefined ? null : Number(fila.precioDesde),
  };
}

async function listar({ limite = reglas.porPagina, pagina = 1, disponible, ...filtros }) {
  const ahora = ahoraEnChile();
  const dias = reglasAgenda.filtroDisponible.find((opcion) => opcion.valor === disponible)?.dias;
  const conHorasHasta = dias === undefined ? null : sumarDias(ahora.hoy, dias);
  const { filas, total } = await modelo.listar({ ...filtros, ahora, conHorasHasta, pagina, limite });
  // Próximas horas libres de cada tarjeta: se muestran y se pueden elegir desde el buscador.
  const { cantidad, dias: horizonte } = reglasAgenda.proximasHoras;
  const horas = await modelo.proximasHoras(filas.map((fila) => Number(fila.id)), ahora, sumarDias(ahora.hoy, horizonte));
  const porProfesional = new Map();
  for (const h of horas) {
    const id = Number(h.profesionalId);
    const delProfesional = porProfesional.get(id) || [];
    if (delProfesional.length < cantidad) porProfesional.set(id, [...delProfesional, { id: Number(h.id), fecha: h.fecha, horaInicio: h.horaInicio, horaFin: h.horaFin }]);
  }
  return {
    profesionales: filas.map((fila) => ({
      ...formatearFicha(fila),
      proximaHora: fila.proximaHora ? { fecha: fila.proximaHora.slice(0, 10), horaInicio: fila.proximaHora.slice(11, 16) } : null,
      proximasHoras: porProfesional.get(Number(fila.id)) || [],
    })),
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
    // «Cita verificada»: la reseña está respaldada por una cita confirmada que ya ocurrió (09-11-2026).
    verificada: Boolean(fila.reservaId),
    fecha: fila.fechaActualizacion.toISOString(),
    propia: fila.usuarioId === usuarioId,
  };
}

// Solo las cuentas de usuario califican, y nadie puede calificar su propia ficha profesional.
const puedeResenar = (usuario, fila) => usuario.rol === 'usuario' && Number(fila.usuarioId) !== usuario.id;

async function ficha(id, usuario) {
  const fila = await modelo.buscarPorId(id, usuario.id);
  if (!fila) throw new ErrorHttp(404, 'No encontramos este profesional');
  const habilitado = puedeResenar(usuario, fila);
  const { hoy: fecha, hora } = ahoraEnChile();
  const [grupos, propia, cita] = await Promise.all([
    resenaModel.distribucion(id),
    resenaModel.buscarDelUsuario(usuario.id, id),
    habilitado ? resenaModel.citaVerificable(usuario.id, id, { fecha, hora }) : null,
  ]);
  // Reseñas verificadas (09-11-2026): una reseña nueva exige una cita confirmada que ya ocurrió; la propia se puede editar.
  const conCita = Boolean(propia || cita);
  return {
    profesional: formatearFicha(fila),
    resumenResenas: resumirResenas(grupos),
    miResena: propia ? formatearResena(propia, usuario.id) : null,
    puedeResenar: habilitado && conCita,
    ...(habilitado && !conCita && { motivoSinResena: 'sin_cita' }),
  };
}

const filtros = () => modelo.filtros();

// Ficha propia del profesional (FS-HU-04): null mientras no la complete.
const formatearMiFicha = (fila) => fila && {
  id: fila.id,
  especialidad: fila.especialidad,
  descripcion: fila.descripcion ?? '',
  comuna: fila.comuna ?? '',
  direccion: fila.direccion ?? '',
  modalidad: fila.modalidad,
  verificado: Boolean(Number(fila.verificado)),
  ubicacionLat: Number(fila.ubicacionLat),
  ubicacionLng: Number(fila.ubicacionLng),
};

async function obtenerMiFicha(usuarioId) { return { ficha: formatearMiFicha(await modelo.obtenerPorUsuario(usuarioId)) }; }
async function guardarMiFicha(usuarioId, datos) { return { ficha: formatearMiFicha(await modelo.guardarFicha(usuarioId, datos)) }; }

// FS-HU-12: Administrador verifica un perfil profesional
async function verificarPerfil(id, administradorId) {
  if (!await modelo.existe(id)) throw new ErrorHttp(404, 'No encontramos este profesional');
  const ficha = await modelo.verificarPerfil(id, administradorId);
  return { id: ficha.id, verificado: ficha.verificado };
}

module.exports = {
  ahoraEnChile, listar, ficha, filtros, formatearFicha, resumirResenas, nombrePublico, formatearResena, obtenerMiFicha, guardarMiFicha, verificarPerfil,
};

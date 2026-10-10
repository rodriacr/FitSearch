const { Prisma } = require('@prisma/client');
const prisma = require('./prisma');

// Solo datos de la ficha pública. Nunca incluir correo de acceso, contraseña ni salud.
// La búsqueda usa SQL parametrizado ($queryRaw) porque combina texto, filtros, la distancia calculada
// en MySQL (ST_Distance_Sphere) y el promedio de reseñas en un solo orden paginado (DAS, D23).

// En LIKE, "%", "_" y "\" son comodines: se escapan para buscar el texto tal como lo escribió la persona.
const escaparLike = (texto) => texto.replace(/[\\%_]/g, (caracter) => `\\${caracter}`);

const ORDENES = {
  nombre: Prisma.sql`u.nombre ASC, p.id ASC`,
  cercania: Prisma.sql`distanciaKm ASC, p.id ASC`,
  calificacion: Prisma.sql`promedio DESC, totalResenas DESC, u.nombre ASC`,
  resenas: Prisma.sql`totalResenas DESC, promedio DESC, u.nombre ASC`,
  // Inicio: primero los verificados por la plataforma y luego los mejor calificados.
  destacados: Prisma.sql`p.verificado DESC, promedio DESC, totalResenas DESC, p.id ASC`,
};

function construirConsulta({ q, especialidad, comuna, modalidad, calificacionMin, ubicacion, distanciaKm, soloFavoritosDe }) {
  const distancia = ubicacion
    ? Prisma.sql`ST_Distance_Sphere(POINT(p.ubicacion_lng, p.ubicacion_lat), POINT(${ubicacion.lng}, ${ubicacion.lat})) / 1000`
    : Prisma.sql`NULL`;
  const condiciones = [Prisma.sql`r.nombre = 'profesional'`, Prisma.sql`u.activo = true`];
  if (q) {
    const patron = `%${escaparLike(q)}%`;
    // La intercalación utf8mb4_unicode_ci ignora mayúsculas y tildes: "nutricion" encuentra "Nutrición".
    condiciones.push(Prisma.sql`(u.nombre LIKE ${patron} OR p.especialidad LIKE ${patron} OR p.descripcion LIKE ${patron})`);
  }
  if (especialidad) condiciones.push(Prisma.sql`p.especialidad = ${especialidad}`);
  if (comuna) condiciones.push(Prisma.sql`p.comuna = ${comuna}`);
  // Quien atiende de ambas formas aparece tanto en "presencial" como en "online".
  if (modalidad) condiciones.push(Prisma.sql`p.modalidad IN (${modalidad}, 'ambas')`);
  if (calificacionMin) condiciones.push(Prisma.sql`COALESCE(c.promedio, 0) >= ${calificacionMin}`);
  if (ubicacion && distanciaKm) condiciones.push(Prisma.sql`${distancia} <= ${distanciaKm}`);
  if (soloFavoritosDe) condiciones.push(Prisma.sql`EXISTS (SELECT 1 FROM favoritos fs WHERE fs.profesional_id = p.id AND fs.usuario_id = ${soloFavoritosDe})`);

  const desde = Prisma.sql`
    FROM profesionales p
    JOIN usuarios u ON u.id = p.usuario_id
    JOIN roles r ON r.id = u.rol_id
    LEFT JOIN establecimientos e ON e.id = p.establecimiento_id
    LEFT JOIN (SELECT profesional_id, AVG(puntaje) AS promedio, COUNT(*) AS total FROM resenas GROUP BY profesional_id) c
      ON c.profesional_id = p.id
    WHERE ${Prisma.join(condiciones, ' AND ')}`;
  return { desde, distancia };
}

async function listar({ usuarioId, orden = 'nombre', pagina = 1, limite = 12, ...filtros }) {
  const { desde, distancia } = construirConsulta(filtros);
  const [filas, [{ total }]] = await Promise.all([
    prisma.$queryRaw`
      SELECT p.id, u.nombre, p.especialidad, p.descripcion, p.comuna, p.modalidad, p.verificado,
        p.ubicacion_lat AS ubicacionLat, p.ubicacion_lng AS ubicacionLng,
        e.nombre AS establecimientoNombre, e.direccion AS establecimientoDireccion,
        COALESCE(c.promedio, 0) AS promedio, COALESCE(c.total, 0) AS totalResenas,
        ${distancia} AS distanciaKm,
        EXISTS (SELECT 1 FROM favoritos f WHERE f.profesional_id = p.id AND f.usuario_id = ${usuarioId}) AS esFavorito
      ${desde}
      ORDER BY ${ORDENES[orden] || ORDENES.nombre}
      LIMIT ${limite} OFFSET ${(pagina - 1) * limite}`,
    prisma.$queryRaw`SELECT COUNT(*) AS total ${desde}`,
  ]);
  return { filas, total: Number(total) };
}

// Ficha individual (GET /api/profesionales/:id) con el mismo formato de fila que el listado.
async function buscarPorId(id, usuarioId) {
  const { desde, distancia } = construirConsulta({});
  const filas = await prisma.$queryRaw`
    SELECT p.id, p.usuario_id AS usuarioId, u.nombre, p.especialidad, p.descripcion, p.comuna, p.modalidad, p.verificado,
      p.ubicacion_lat AS ubicacionLat, p.ubicacion_lng AS ubicacionLng,
      e.nombre AS establecimientoNombre, e.direccion AS establecimientoDireccion,
      COALESCE(c.promedio, 0) AS promedio, COALESCE(c.total, 0) AS totalResenas,
      ${distancia} AS distanciaKm,
      EXISTS (SELECT 1 FROM favoritos f WHERE f.profesional_id = p.id AND f.usuario_id = ${usuarioId}) AS esFavorito
    ${desde} AND p.id = ${id}`;
  return filas[0] || null;
}

async function existe(id) {
  const fila = await prisma.profesional.findFirst({ where: { id, usuario: { rol: { nombre: 'profesional' } } }, select: { id: true, usuarioId: true } });
  return fila;
}

// Valores disponibles para los filtros del buscador (solo los que tienen al menos un profesional).
async function filtros() {
  const donde = { usuario: { activo: true, rol: { nombre: 'profesional' } } };
  const [especialidades, comunas] = await Promise.all([
    prisma.profesional.findMany({ where: donde, select: { especialidad: true }, distinct: ['especialidad'], orderBy: { especialidad: 'asc' } }),
    prisma.profesional.findMany({ where: { ...donde, comuna: { not: null } }, select: { comuna: true }, distinct: ['comuna'], orderBy: { comuna: 'asc' } }),
  ]);
  return { especialidades: especialidades.map((fila) => fila.especialidad), comunas: comunas.map((fila) => fila.comuna) };
}

// Ficha propia del profesional (FS-HU-04). La fila de "profesionales" no existe hasta que la completa por primera vez.
const seleccionFicha = { id: true, especialidad: true, descripcion: true, comuna: true, modalidad: true, verificado: true, ubicacionLat: true, ubicacionLng: true };

function obtenerPorUsuario(usuarioId) {
  return prisma.profesional.findUnique({ where: { usuarioId }, select: seleccionFicha });
}

// Crea o actualiza la ficha: una cuenta tiene como máximo una (usuario_id es único).
function guardarFicha(usuarioId, datos) {
  return prisma.$transaction(async (tx) => {
    const ficha = await tx.profesional.findUnique({ where: { usuarioId } });
    if (!ficha) return tx.profesional.create({ data: { usuarioId, ...datos }, select: seleccionFicha });
    const retirar = ficha.verificado && datos.especialidad !== ficha.especialidad;
    const historial = Array.isArray(ficha.historialVerificacion) ? ficha.historialVerificacion : [];
    const cambio = await tx.profesional.updateMany({ where: { id: ficha.id, revisionVerificacion: ficha.revisionVerificacion }, data: {
      ...datos, revisionVerificacion: { increment: 1 },
      ...(retirar && { verificado: false, estadoVerificacion: 'pendiente', motivoRechazo: null, historialVerificacion: [...historial, { accion: 'cambio_especialidad', fecha: new Date().toISOString() }] }),
    } });
    if (!cambio.count) throw new (require('../utils/ErrorHttp'))(409, 'Tu ficha cambió. Actualiza la pantalla antes de guardar');
    return tx.profesional.findUnique({ where: { usuarioId }, select: seleccionFicha });
  });
}

function verificarPerfil(id, administradorId) {
  return require('./verificacion.model').decidir(id, { accion: 'aprobar', administradorId });
}

module.exports = { listar, buscarPorId, existe, filtros, escaparLike, obtenerPorUsuario, guardarFicha, verificarPerfil };

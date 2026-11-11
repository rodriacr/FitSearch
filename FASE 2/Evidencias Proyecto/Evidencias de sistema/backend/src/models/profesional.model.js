const { Prisma } = require('@prisma/client');
const prisma = require('./prisma');
const ErrorHttp = require('../utils/ErrorHttp');
const verificacion = require('./verificacion.model');

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
  // «Disponibles antes» (09-11-2026): la próxima hora libre más cercana primero; sin horas, al final.
  disponibilidad: Prisma.sql`proximaHora IS NULL, proximaHora ASC, promedio DESC, p.id ASC`,
};

// Horarios que se pueden reservar ahora (alias d): futuros en hora de Chile, no retirados, sin reserva activa y fuera de
// las fechas bloqueadas por el profesional (mejoras del 09-11-2026).
function horariosLibres({ hoy, segundos }) {
  return Prisma.sql`d.retirado = FALSE
    AND (d.fecha > ${hoy} OR (d.fecha = ${hoy} AND TIME_TO_SEC(d.hora_inicio) > ${segundos}))
    AND NOT EXISTS (SELECT 1 FROM reservas rv WHERE rv.disponibilidad_id = d.id AND rv.estado IN ('pendiente', 'confirmada'))
    AND NOT EXISTS (SELECT 1 FROM bloqueos_agenda b WHERE b.profesional_id = d.profesional_id AND d.fecha BETWEEN b.fecha_inicio AND b.fecha_fin)`;
}

function construirConsulta({ q, especialidad, comuna, modalidad, calificacionMin, ubicacion, distanciaKm, soloFavoritosDe, ahora, conHorasHasta }) {
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
  // «Con horas disponibles»: al menos un horario libre hasta la fecha indicada (filtro del buscador).
  if (ahora && conHorasHasta) {
    condiciones.push(Prisma.sql`EXISTS (SELECT 1 FROM disponibilidades d WHERE d.profesional_id = p.id AND ${horariosLibres(ahora)} AND d.fecha <= ${conHorasHasta})`);
  }
  if (soloFavoritosDe) condiciones.push(Prisma.sql`EXISTS (SELECT 1 FROM favoritos fs WHERE fs.profesional_id = p.id AND fs.usuario_id = ${soloFavoritosDe})`);

  const desde = Prisma.sql`
    FROM profesionales p
    JOIN usuarios u ON u.id = p.usuario_id
    JOIN roles r ON r.id = u.rol_id
    LEFT JOIN establecimientos e ON e.id = p.establecimiento_id
    LEFT JOIN (SELECT profesional_id, AVG(puntaje) AS promedio, COUNT(*) AS total FROM resenas GROUP BY profesional_id) c
      ON c.profesional_id = p.id
    WHERE ${Prisma.join(condiciones, ' AND ')}`;
  // Próxima hora libre ('AAAA-MM-DD HH:MM') para la tarjeta del buscador y el orden «Disponibles antes».
  const proxima = ahora
    ? Prisma.sql`(SELECT MIN(CONCAT(DATE_FORMAT(d.fecha, '%Y-%m-%d'), ' ', TIME_FORMAT(d.hora_inicio, '%H:%i')))
        FROM disponibilidades d WHERE d.profesional_id = p.id AND ${horariosLibres(ahora)})`
    : Prisma.sql`NULL`;
  return { desde, distancia, proxima };
}

// Columnas de la ficha pública que agregó FS-HU-29 (experiencia) y el precio referencial (09-11-2026).
const COLUMNAS_EXPERIENCIA = Prisma.sql`p.anios_experiencia AS aniosExperiencia, p.formacion, p.atiende_a AS atiendeA,
  p.registro_sis AS registroSis, p.precio_desde AS precioDesde`;

// Próximas horas libres de los profesionales de una página del buscador, hasta "hasta" (las agrupa el servicio).
function proximasHoras(ids, ahora, hasta) {
  if (!ids.length) return [];
  return prisma.$queryRaw`
    SELECT d.id, d.profesional_id AS profesionalId, DATE_FORMAT(d.fecha, '%Y-%m-%d') AS fecha,
      TIME_FORMAT(d.hora_inicio, '%H:%i') AS horaInicio, TIME_FORMAT(d.hora_fin, '%H:%i') AS horaFin
    FROM disponibilidades d
    WHERE d.profesional_id IN (${Prisma.join(ids)}) AND ${horariosLibres(ahora)} AND d.fecha <= ${hasta}
    ORDER BY d.profesional_id, d.fecha, d.hora_inicio`;
}

async function listar({ usuarioId, orden = 'nombre', pagina = 1, limite = 12, ...filtros }) {
  const { desde, distancia, proxima } = construirConsulta(filtros);
  const [filas, [{ total }]] = await Promise.all([
    prisma.$queryRaw`
      SELECT p.id, u.nombre, p.especialidad, p.descripcion, p.comuna, p.direccion, p.modalidad, p.verificado,
        p.ubicacion_lat AS ubicacionLat, p.ubicacion_lng AS ubicacionLng,
        e.nombre AS establecimientoNombre, e.direccion AS establecimientoDireccion,
        COALESCE(c.promedio, 0) AS promedio, COALESCE(c.total, 0) AS totalResenas,
        ${distancia} AS distanciaKm, ${proxima} AS proximaHora, ${COLUMNAS_EXPERIENCIA},
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
    SELECT p.id, p.usuario_id AS usuarioId, u.nombre, p.especialidad, p.descripcion, p.comuna, p.direccion, p.modalidad, p.verificado,
      p.ubicacion_lat AS ubicacionLat, p.ubicacion_lng AS ubicacionLng,
      e.nombre AS establecimientoNombre, e.direccion AS establecimientoDireccion,
      COALESCE(c.promedio, 0) AS promedio, COALESCE(c.total, 0) AS totalResenas,
      ${distancia} AS distanciaKm, ${COLUMNAS_EXPERIENCIA},
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
const seleccionFicha = {
  id: true, especialidad: true, descripcion: true, comuna: true, direccion: true, modalidad: true, verificado: true, ubicacionLat: true, ubicacionLng: true,
};

function obtenerPorUsuario(usuarioId) {
  return prisma.profesional.findUnique({ where: { usuarioId }, select: seleccionFicha });
}

// Crea o actualiza la ficha: una cuenta tiene como máximo una (usuario_id es único).
// La especialidad elegida se bloquea en modo compartido hasta guardar (revisión del PR #42): si el administrador la
// está eliminando, renombrando o desactivando, una de las dos operaciones espera a la otra. Se bloquea por su id, igual
// que lo hace el administrador: bloquearla por el nombre producía un interbloqueo con el borrado (MySQL 1213). Si se
// renombró o se eliminó entre la búsqueda y el bloqueo, no se encuentra y la ficha no se guarda. Debe estar activa;
// una desactivada solo se acepta si es la que la ficha ya tenía (igual que ficha.validators).
const especialidadNoDisponible = () => new ErrorHttp(400, 'Selecciona tu especialidad', { especialidad: 'Selecciona tu especialidad' });

function guardarFicha(usuarioId, datos) {
  return prisma.$transaction(async (tx) => {
    const ficha = await tx.profesional.findUnique({ where: { usuarioId } });
    const [encontrada] = await tx.$queryRaw`SELECT id FROM especialidades WHERE nombre = ${datos.especialidad}`;
    const [catalogo] = encontrada
      ? await tx.$queryRaw`SELECT activa FROM especialidades WHERE id = ${encontrada.id} AND nombre = ${datos.especialidad} FOR SHARE`
      : [];
    if (!catalogo || (!Number(catalogo.activa) && ficha?.especialidad !== datos.especialidad)) throw especialidadNoDisponible();
    if (!ficha) return tx.profesional.create({ data: { usuarioId, ...datos }, select: seleccionFicha });
    const especialidadCambio = datos.especialidad !== ficha.especialidad;
    const teniaSolicitud = ficha.verificado || ficha.estadoVerificacion === 'pendiente';
    const historial = Array.isArray(ficha.historialVerificacion) ? ficha.historialVerificacion : [];
    const cambio = await tx.profesional.updateMany({ where: { id: ficha.id, revisionVerificacion: ficha.revisionVerificacion }, data: {
      ...datos, revisionVerificacion: { increment: 1 },
      ...(especialidadCambio && {
        verificado: false, estadoVerificacion: teniaSolicitud ? 'rechazado' : 'sin_solicitud',
        motivoRechazo: teniaSolicitud ? 'La especialidad cambió. Adjunta documentos de la nueva especialidad y envía otra solicitud.' : null,
        historialVerificacion: [...historial, { accion: 'cambio_especialidad', fecha: new Date().toISOString() }],
      }),
    } });
    if (!cambio.count) throw new ErrorHttp(409, 'Tu ficha cambió. Actualiza la pantalla antes de guardar');
    return tx.profesional.findUnique({ where: { usuarioId }, select: seleccionFicha });
  });
}

function verificarPerfil(id, administradorId) {
  return verificacion.decidir(id, { accion: 'aprobar', administradorId });
}

module.exports = {
  listar, buscarPorId, existe, filtros, escaparLike, obtenerPorUsuario, guardarFicha, verificarPerfil, proximasHoras,
};

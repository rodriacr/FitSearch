const { Prisma } = require('@prisma/client');
const prisma = require('./prisma');

// Directorio de centros de salud y gimnasios (FS-HU-25). Solo muestra establecimientos activos de una categoría, tal
// como los registró el administrador (FS-HU-30). Igual que el buscador de profesionales, usa SQL parametrizado para
// calcular la distancia en MySQL (ST_Distance_Sphere) y ordenar y paginar en una sola consulta (DAS, D23).

const ORDENES = {
  nombre: Prisma.sql`e.nombre ASC, e.id ASC`,
  cercania: Prisma.sql`distanciaKm ASC, e.id ASC`,
};

// Los profesionales asociados que se cuentan y se muestran son fichas de cuentas profesionales activas.
const PROFESIONALES_VISIBLES = Prisma.sql`
  FROM profesionales p
  JOIN usuarios u ON u.id = p.usuario_id
  JOIN roles r ON r.id = u.rol_id
  WHERE r.nombre = 'profesional' AND u.activo = true`;
const DONDE_PROFESIONAL_VISIBLE = { usuario: { activo: true, rol: { nombre: 'profesional' } } };

function construirConsulta({ categoria, comuna, ubicacion, distanciaKm }) {
  const distancia = ubicacion
    ? Prisma.sql`ST_Distance_Sphere(POINT(e.ubicacion_lng, e.ubicacion_lat), POINT(${ubicacion.lng}, ${ubicacion.lat})) / 1000`
    : Prisma.sql`NULL`;
  const condiciones = [Prisma.sql`e.activo = true`, Prisma.sql`e.categoria = ${categoria}`];
  if (comuna) condiciones.push(Prisma.sql`e.comuna = ${comuna}`);
  if (ubicacion && distanciaKm) condiciones.push(Prisma.sql`${distancia} <= ${distanciaKm}`);
  return { desde: Prisma.sql`FROM establecimientos e WHERE ${Prisma.join(condiciones, ' AND ')}`, distancia };
}

async function listar({ orden = 'nombre', pagina = 1, limite = 12, ...filtros }) {
  const { desde, distancia } = construirConsulta(filtros);
  const [filas, [{ total }]] = await Promise.all([
    prisma.$queryRaw`
      SELECT e.id, e.nombre, e.categoria, e.comuna, e.direccion,
        e.ubicacion_lat AS ubicacionLat, e.ubicacion_lng AS ubicacionLng,
        ${distancia} AS distanciaKm,
        (SELECT COUNT(*) ${PROFESIONALES_VISIBLES} AND p.establecimiento_id = e.id) AS totalProfesionales
      ${desde}
      ORDER BY ${ORDENES[orden] || ORDENES.nombre}
      LIMIT ${limite} OFFSET ${(pagina - 1) * limite}`,
    prisma.$queryRaw`SELECT COUNT(*) AS total ${desde}`,
  ]);
  return { filas, total: Number(total) };
}

// Ficha de un establecimiento activo con sus profesionales asociados: primero los verificados por la plataforma.
function buscarPorId(id) {
  return prisma.establecimiento.findFirst({
    where: { id, activo: true },
    select: {
      id: true, nombre: true, categoria: true, comuna: true, direccion: true, ubicacionLat: true, ubicacionLng: true,
      profesionales: {
        where: DONDE_PROFESIONAL_VISIBLE,
        select: { id: true, especialidad: true, modalidad: true, verificado: true, usuario: { select: { nombre: true } } },
        orderBy: [{ verificado: 'desc' }, { id: 'asc' }],
      },
    },
  });
}

// Comunas con establecimientos activos de la categoría, para el filtro.
async function comunas(categoria) {
  const filas = await prisma.establecimiento.findMany({
    where: { activo: true, categoria, comuna: { not: null } },
    select: { comuna: true },
    distinct: ['comuna'],
    orderBy: { comuna: 'asc' },
  });
  return filas.map((fila) => fila.comuna);
}

module.exports = { listar, buscarPorId, comunas };

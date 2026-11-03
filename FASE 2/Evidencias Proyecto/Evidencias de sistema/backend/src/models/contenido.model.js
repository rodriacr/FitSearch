// Catálogos que administra el administrador (FS-HU-30): especialidades, alimentos y establecimientos. Un elemento en uso
// no se borra: se desactiva para que no aparezca en elementos nuevos, sin perder el historial.
const prisma = require('./prisma');
const ErrorHttp = require('../utils/ErrorHttp');

// Para cada catálogo: tabla de Prisma, campo del estado, campos de búsqueda y datos que se leen.
const CATALOGOS = {
  especialidades: {
    tabla: 'especialidad', activo: 'activa', buscarEn: ['nombre'],
    seleccion: { id: true, nombre: true, activa: true },
  },
  alimentos: {
    tabla: 'alimento', activo: 'activo', buscarEn: ['nombre', 'sinonimos'],
    seleccion: {
      id: true, nombre: true, sinonimos: true, calorias: true, proteinasG: true, carbohidratosG: true, grasasG: true, activo: true,
      _count: { select: { registros: true } },
    },
  },
  establecimientos: {
    tabla: 'establecimiento', activo: 'activo', buscarEn: ['nombre', 'comuna', 'direccion'],
    seleccion: {
      id: true, nombre: true, categoria: true, comuna: true, direccion: true, ubicacionLat: true, ubicacionLng: true, activo: true,
      _count: { select: { profesionales: true } },
    },
  },
};
const NOMBRE = { especialidades: 'una especialidad', alimentos: 'un alimento', establecimientos: 'un establecimiento' };
const noEncontrado = () => new ErrorHttp(404, 'No encontramos ese elemento');
const nombreRepetido = (catalogo) => new ErrorHttp(409, `Ya existe ${NOMBRE[catalogo]} con ese nombre`, { nombre: `Ya existe ${NOMBRE[catalogo]} con ese nombre` });

// Cuántas fichas usan cada especialidad: las fichas guardan el nombre, no el id. La comparación ignora mayúsculas y
// tildes, igual que MySQL.
const clave = (texto) => texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
async function fichasPorEspecialidad(nombres, db = prisma) {
  if (nombres.length === 0) return new Map();
  const filas = await db.profesional.groupBy({ by: ['especialidad'], where: { especialidad: { in: nombres } }, _count: { _all: true } });
  const usos = new Map();
  for (const fila of filas) usos.set(clave(fila.especialidad), (usos.get(clave(fila.especialidad)) ?? 0) + fila._count._all);
  return usos;
}

// Cuántas veces se usa un elemento: fichas de profesionales (especialidades y establecimientos) o registros de comidas.
async function enUso(catalogo, fila, db = prisma) {
  if (catalogo === 'especialidades') return (await fichasPorEspecialidad([fila.nombre], db)).get(clave(fila.nombre)) ?? 0;
  return catalogo === 'alimentos' ? fila._count.registros : fila._count.profesionales;
}

async function listar(catalogo, { q, estado, pagina, limite }) {
  const { tabla, activo, buscarEn, seleccion } = CATALOGOS[catalogo];
  const where = {
    ...(estado && { [activo]: estado === 'activos' }),
    ...(q && { OR: buscarEn.map((campo) => ({ [campo]: { contains: q } })) }),
  };
  const [filas, total] = await Promise.all([
    prisma[tabla].findMany({ where, select: seleccion, orderBy: [{ nombre: 'asc' }, { id: 'asc' }], skip: (pagina - 1) * limite, take: limite }),
    prisma[tabla].count({ where }),
  ]);
  if (catalogo === 'especialidades') {
    const usos = await fichasPorEspecialidad(filas.map(({ nombre }) => nombre));
    return { filas: filas.map((fila) => ({ ...fila, enUso: usos.get(clave(fila.nombre)) ?? 0 })), total };
  }
  return { filas: filas.map((fila) => ({ ...fila, enUso: catalogo === 'alimentos' ? fila._count.registros : fila._count.profesionales })), total };
}

async function obtener(catalogo, id, db = prisma) {
  const { tabla, seleccion } = CATALOGOS[catalogo];
  const fila = await db[tabla].findUnique({ where: { id }, select: seleccion });
  if (!fila) throw noEncontrado();
  return { ...fila, enUso: await enUso(catalogo, fila, db) };
}

async function crear(catalogo, datos) {
  const { tabla, seleccion } = CATALOGOS[catalogo];
  try {
    const fila = await prisma[tabla].create({ data: datos, select: seleccion });
    return { ...fila, enUso: 0 };
  } catch (error) {
    if (error.code === 'P2002') throw nombreRepetido(catalogo);
    throw error;
  }
}

// Renombrar una especialidad actualiza las fichas que la usan, en la misma transacción, para que el directorio y sus
// filtros sigan encontrándolas. No cambia la verificación de esas fichas: es la misma especialidad con otro nombre.
async function actualizar(catalogo, id, datos) {
  const { tabla } = CATALOGOS[catalogo];
  try {
    return await prisma.$transaction(async (tx) => {
      const anterior = await obtener(catalogo, id, tx);
      await tx[tabla].update({ where: { id }, data: datos });
      if (catalogo === 'especialidades' && datos.nombre !== anterior.nombre) {
        await tx.profesional.updateMany({ where: { especialidad: anterior.nombre }, data: { especialidad: datos.nombre } });
      }
      return obtener(catalogo, id, tx);
    });
  } catch (error) {
    if (error.code === 'P2002') throw nombreRepetido(catalogo);
    throw error;
  }
}

async function cambiarEstado(catalogo, id, activo) {
  const { tabla, activo: campo } = CATALOGOS[catalogo];
  await obtener(catalogo, id);
  await prisma[tabla].update({ where: { id }, data: { [campo]: activo } });
  return obtener(catalogo, id);
}

// Solo se borra lo que nadie usa; si está en uso, responde 409 con el uso para que la interfaz ofrezca desactivarlo.
const MOTIVO_EN_USO = {
  especialidades: (n) => `${n === 1 ? 'la usa la ficha de 1 profesional' : `la usan las fichas de ${n} profesionales`}. Puedes desactivarla para que no aparezca en fichas nuevas`,
  alimentos: (n) => `aparece en ${n === 1 ? '1 registro' : `${n} registros`} de comidas. Puedes desactivarlo para que no aparezca al registrar comidas`,
  establecimientos: (n) => `tiene ${n === 1 ? '1 profesional asociado' : `${n} profesionales asociados`}. Puedes desactivarlo para que no aparezca en el directorio`,
};
async function eliminar(catalogo, id) {
  const { tabla } = CATALOGOS[catalogo];
  await prisma.$transaction(async (tx) => {
    const fila = await obtener(catalogo, id, tx);
    if (fila.enUso > 0) throw new ErrorHttp(409, `No se puede eliminar «${fila.nombre}»: ${MOTIVO_EN_USO[catalogo](fila.enUso)}.`, { enUso: fila.enUso });
    await tx[tabla].delete({ where: { id } });
  });
}

module.exports = { CATALOGOS, listar, obtener, crear, actualizar, cambiarEstado, eliminar };

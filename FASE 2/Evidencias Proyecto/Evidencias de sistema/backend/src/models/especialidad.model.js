// Catálogo de especialidades (FS-HU-30): lo administra el administrador y lo usan la ficha del profesional, la portada y
// el asistente IA. Las fichas guardan el nombre de la especialidad (profesionales.especialidad).
const prisma = require('./prisma');

// Nombres de las especialidades activas, en orden alfabético.
async function nombresActivos() {
  const filas = await prisma.especialidad.findMany({ where: { activa: true }, orderBy: { nombre: 'asc' }, select: { nombre: true } });
  return filas.map(({ nombre }) => nombre);
}

// Nombre tal como está en el catálogo de una especialidad activa, o null. La intercalación de MySQL ignora mayúsculas
// y tildes: «nutricion» devuelve «Nutrición».
async function activaPorNombre(nombre) {
  const fila = await prisma.especialidad.findFirst({ where: { nombre, activa: true }, select: { nombre: true } });
  return fila?.nombre ?? null;
}

module.exports = { nombresActivos, activaPorNombre };

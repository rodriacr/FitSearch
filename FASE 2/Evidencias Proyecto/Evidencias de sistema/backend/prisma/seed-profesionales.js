// Datos ficticios opcionales del directorio (FS-HU-03, FS-HU-22 y FS-HU-24). No modifica el seed habitual
// ni permite iniciar sesión: las cuentas no tienen contraseña. Todos los nombres terminan en "Demo".
require('dotenv').config({ quiet: true });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// [especialidad, nombre, descripción, comuna, modalidad, latitud, longitud, establecimiento]
const PROFESIONALES = [
  ['Nutrición', 'Ana Demo', 'Orientación nutricional.', 'Melipilla', 'presencial', -33.686, -71.215, 'Consulta de demostración 1'],
  ['Kinesiología', 'Diego Demo', 'Rehabilitación y movimiento.', 'Melipilla', 'ambas', -33.689, -71.213, 'Consulta de demostración 2'],
  ['Entrenamiento personal', 'Camila Demo', 'Actividad física personalizada.', 'Melipilla', 'ambas', -33.684, -71.21, null],
  ['Entrenamiento personal', 'Matías Demo', 'Planes de fuerza y acondicionamiento.', 'Santiago', 'presencial', -33.4372, -70.6506, null],
  ['Nutrición', 'Fernanda Demo', 'Nutrición deportiva y hábitos saludables.', 'Las Condes', 'online', -33.4089, -70.5672, null],
  ['Kinesiología', 'Felipe Demo', 'Kinesiología deportiva y prevención de lesiones.', 'Providencia', 'presencial', -33.4314, -70.6093, 'Centro de demostración Providencia'],
  ['Entrenamiento personal', 'Valentina Demo', 'Entrenamiento funcional para todas las edades.', 'Ñuñoa', 'ambas', -33.4569, -70.5976, null],
  ['Psicología deportiva', 'Ignacio Demo', 'Motivación, ansiedad competitiva y adherencia al ejercicio.', 'Providencia', 'online', -33.4251, -70.6145, null],
  ['Medicina deportiva', 'Josefa Demo', 'Evaluación médica para la actividad física.', 'Maipú', 'presencial', -33.5101, -70.7572, 'Clínica de demostración Maipú'],
  ['Nutrición', 'Tomás Demo', 'Alimentación para bajar de peso de forma sostenible.', 'La Florida', 'ambas', -33.5227, -70.598, null],
  ['Kinesiología', 'Catalina Demo', 'Rehabilitación de rodilla y columna.', 'Puente Alto', 'presencial', -33.6117, -70.5758, null],
  ['Entrenamiento personal', 'Benjamín Demo', 'Entrenamiento al aire libre y running.', 'Talagante', 'presencial', -33.6639, -70.9272, null],
];

const RESENADORES = ['Valeria Demo', 'Martín Demo', 'Daniela Demo', 'Cristóbal Demo'];

// Por profesional (mismo orden que PROFESIONALES): [índice del reseñador, puntaje, comentario o null].
// Algunos quedan sin reseñas para ver el estado vacío.
const NOTA = ' (reseña ficticia de demostración)';
const RESENAS = [
  [[0, 5, 'Muy clara al explicar el plan de alimentación.'], [1, 4, null]],
  [[2, 4, 'Buen seguimiento de los ejercicios en casa.']],
  [],
  [[0, 5, 'Sesiones exigentes y bien planificadas.'], [1, 5, null], [2, 4, 'Puntual y motivador.'], [3, 5, null]],
  [[1, 3, 'Las sesiones online a veces se atrasan.'], [3, 4, null]],
  [[0, 5, 'Me ayudó a volver a correr sin dolor.'], [2, 5, null], [3, 4, 'Atención cercana.']],
  [[1, 4, 'Clases entretenidas y variadas.']],
  [],
  [[0, 4, 'Evaluación completa antes de empezar a entrenar.'], [3, 3, null]],
  [[2, 5, 'Cambios pequeños que sí pude mantener.'], [1, 4, null]],
  [[3, 2, 'Me costó coordinar los horarios.']],
  [],
];

async function main() {
  if (process.env.NODE_ENV === 'production') throw new Error('Los datos de demostración son solo para desarrollo.');
  const [rolProfesional, rolUsuario] = await Promise.all(['profesional', 'usuario'].map((nombre) => prisma.rol.findUnique({ where: { nombre } })));
  if (!rolProfesional || !rolUsuario) throw new Error('Ejecuta primero npm run db:seed para cargar los roles.');

  const idsProfesionales = [];
  for (const [indice, [especialidad, nombre, descripcion, comuna, modalidad, ubicacionLat, ubicacionLng, establecimiento]] of PROFESIONALES.entries()) {
    // Los tres primeros conservan el correo de la versión anterior (HU-03) para no duplicarlos.
    const correo = indice < 3 ? `hu03-demo-${indice + 1}@example.test` : `hu22-demo-${indice - 2}@example.test`;
    const existente = await prisma.usuario.findUnique({ where: { correo }, include: { profesional: true } });
    if (existente?.profesional) {
      // No sobrescribe fichas editadas: solo completa la comuna y la modalidad si aún no las tienen.
      if (!existente.profesional.comuna) {
        await prisma.profesional.update({ where: { id: existente.profesional.id }, data: { comuna, modalidad } });
      }
      idsProfesionales.push(existente.profesional.id);
      continue;
    }
    if (existente) { idsProfesionales.push(null); continue; }
    const usuario = await prisma.usuario.create({ data: {
      nombre, correo, passwordHash: null, rolId: rolProfesional.id, rolConfirmado: true,
      profesional: { create: {
        especialidad, descripcion: `${descripcion} Perfil ficticio de demostración.`, comuna, modalidad, ubicacionLat, ubicacionLng,
        ...(establecimiento ? { establecimiento: { create: {
          nombre: establecimiento, categoria: 'Salud', direccion: `Ubicación de ejemplo en ${comuna}, Chile`, ubicacionLat, ubicacionLng,
        } } } : {}),
      } },
    }, include: { profesional: true } });
    idsProfesionales.push(usuario.profesional.id);
  }

  const idsResenadores = [];
  for (const [indice, nombre] of RESENADORES.entries()) {
    const correo = `hu24-resenador-${indice + 1}@example.test`;
    const usuario = await prisma.usuario.upsert({
      where: { correo }, update: {},
      create: { nombre, correo, passwordHash: null, rolId: rolUsuario.id, rolConfirmado: true, perfil: { create: {} } },
    });
    idsResenadores.push(usuario.id);
  }

  // skipDuplicates: no reemplaza reseñas que ya existan para la misma pareja usuario-profesional.
  const resenas = RESENAS.flatMap((lista, indice) => (idsProfesionales[indice] ? lista.map(([resenador, puntaje, comentario]) => ({
    usuarioId: idsResenadores[resenador], profesionalId: idsProfesionales[indice], puntaje,
    comentario: comentario ? `${comentario}${NOTA}` : null,
  })) : []));
  await prisma.resena.createMany({ data: resenas, skipDuplicates: true });
  console.log(`Datos ficticios disponibles: ${PROFESIONALES.length} profesionales y ${resenas.length} reseñas; cuentas sin contraseña de acceso.`);
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());

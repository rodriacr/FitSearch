// Datos ficticios opcionales de HU-03. No modifica el seed habitual ni permite iniciar sesión.
require('dotenv').config({ quiet: true });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === 'production') throw new Error('Los datos de demostración son solo para desarrollo.');
  const rol = await prisma.rol.findUnique({ where: { nombre: 'profesional' } });
  if (!rol) throw new Error('Ejecuta primero npm run db:seed para cargar los roles.');
  const ejemplos = [
    ['Nutrición', 'Ana Demo', 'Orientación nutricional. Perfil ficticio de demostración.', -33.686, -71.215],
    ['Kinesiología', 'Diego Demo', 'Rehabilitación y movimiento. Perfil ficticio de demostración.', -33.689, -71.213],
    ['Entrenamiento personal', 'Camila Demo', 'Actividad física personalizada. Perfil ficticio de demostración.', -33.684, -71.21],
  ];
  for (const [indice, [especialidad, nombre, descripcion, ubicacionLat, ubicacionLng]] of ejemplos.entries()) {
    const correo = `hu03-demo-${indice + 1}@example.test`;
    // Si ya existe, no sobrescribir cuentas ni fichas editadas; el seed es idempotente.
    if (await prisma.usuario.findUnique({ where: { correo } })) continue;
    await prisma.usuario.create({ data: {
      nombre, correo, passwordHash: null, rolId: rol.id,
      profesional: { create: {
        especialidad, descripcion, ubicacionLat, ubicacionLng,
        ...(indice < 2 ? { establecimiento: { create: {
          nombre: `Consulta de demostración ${indice + 1}`, categoria: 'Salud',
          direccion: 'Ubicación de ejemplo en Melipilla, Chile', ubicacionLat, ubicacionLng,
        } } } : {}),
      } },
    } });
  }
  console.log('Datos ficticios HU-03 disponibles; cuentas sin contraseña de acceso.');
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());

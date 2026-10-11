// Herramienta local para el responsable de la base de datos. No se expone en la API.
require('dotenv').config({ quiet: true });
const prisma = require('../src/models/prisma');
const argumentos = process.argv.slice(2);
const correo = argumentos[argumentos.indexOf('--correo') + 1];
async function ejecutar() {
  if (!argumentos.includes('--correo') || !correo || correo.startsWith('--') || !argumentos.includes('--confirmar')) throw new Error('Uso: npm run admin:promover -- --correo correo-de-la-cuenta --confirmar');
  await prisma.$transaction(async (tx) => {
    const usuario = await tx.usuario.findUnique({ where: { correo }, include: { rol: true } });
    if (!usuario) throw new Error('Primero registra la cuenta en FitSearch');
    if (!usuario.activo) throw new Error('La cuenta debe estar activa');
    if (usuario.rol.nombre === 'administrador') return;
    if (usuario.rol.nombre === 'profesional') throw new Error('Usa una cuenta independiente del perfil profesional');
    const rol = await tx.rol.findUniqueOrThrow({ where: { nombre: 'administrador' } });
    await tx.usuario.update({ where: { id: usuario.id }, data: { rolId: rol.id, rolConfirmado: true, versionSesion: { increment: 1 } } });
  });
  console.log('Cuenta administrativa preparada. Inicia sesión nuevamente en FitSearch.');
}
ejecutar().catch((error) => { console.error(error.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());

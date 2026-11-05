// Regresión real de la revisión del PR #42 (FS-HU-30): guardar una ficha y eliminar su especialidad al mismo tiempo ya
// no deja la ficha con una especialidad inexistente. Llama a los modelos contra MySQL local, con cuentas y especialidades
// temporales que se eliminan al terminar. Uso: npm run test:mysql:especialidades
const path = require('node:path');
const assert = require('node:assert/strict');
const base = path.resolve(__dirname, '..');
require(path.join(base, 'node_modules/dotenv')).config({ path: path.join(base, '.env'), quiet: true });
const db = require(path.join(base, 'src/models/prisma'));
const contenido = require(path.join(base, 'src/models/contenido.model'));
const profesionales = require(path.join(base, 'src/models/profesional.model'));

const marca = Date.now();
const resultado = [];
const usuarios = [];
const especialidades = [];
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
const comprobar = (caso, real, esperado) => { assert.deepEqual(real, esperado, caso); resultado.push(`OK  ${caso}`); };
const pausa = () => { let soltar; const promesa = new Promise((r) => { soltar = r; }); return { promesa, soltar }; };

async function profesional(nombre) {
  const rol = await db.rol.findUniqueOrThrow({ where: { nombre: 'profesional' } });
  const u = await db.usuario.create({ data: { nombre, correo: `qa.carrera.${nombre}.${marca}@example.com`, rolId: rol.id, rolConfirmado: true } });
  usuarios.push(u.id);
  await db.profesional.create({ data: { usuarioId: u.id, especialidad: 'Nutrición', comuna: 'Ñuñoa', ubicacionLat: -33.45, ubicacionLng: -70.6 } });
  return u.id;
}
async function especialidad(nombre) {
  const e = await db.especialidad.create({ data: { nombre: `${nombre} ${marca}` } });
  especialidades.push(e.id);
  return e;
}
const datosFicha = (esp) => ({ especialidad: esp, descripcion: null, comuna: 'Ñuñoa', direccion: 'Calle QA 1', modalidad: 'presencial', ubicacionLat: -33.45, ubicacionLng: -70.6 });
const estado = (promesa) => promesa.then(() => 'ok', (e) => e.estado ?? e.message);

(async () => {
  try {
    // 1) El administrador ya bloqueó la especialidad para eliminarla; la ficha llega en ese momento.
    const ana = await profesional('ana');
    const yoga = await especialidad('QA Yoga');
    const p1 = pausa();
    const admin = db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM especialidades WHERE id = ${yoga.id} FOR UPDATE`;
      await p1.promesa;
      await tx.especialidad.delete({ where: { id: yoga.id } });
    }, { timeout: 20000 });
    await esperar(300);
    const guardado = estado(profesionales.guardarFicha(ana, datosFicha(yoga.nombre)));
    await esperar(700);
    p1.soltar();
    await admin;
    comprobar('con el borrado en curso, guardar la ficha espera y responde 400', await guardado, 400);
    comprobar('la ficha conserva su especialidad anterior', (await db.profesional.findUnique({ where: { usuarioId: ana } })).especialidad, 'Nutrición');

    // 2) La ficha se está guardando con la especialidad; el administrador intenta eliminarla en ese momento.
    const beto = await profesional('beto');
    const pilates = await especialidad('QA Pilates');
    const p2 = pausa();
    const ficha = db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT nombre FROM especialidades WHERE nombre = ${pilates.nombre} FOR SHARE`;
      await tx.profesional.update({ where: { usuarioId: beto }, data: { especialidad: pilates.nombre } });
      await p2.promesa;
    }, { timeout: 20000 });
    await esperar(300);
    const borrado = estado(contenido.eliminar('especialidades', pilates.id));
    await esperar(700);
    comprobar('mientras se guarda la ficha, el borrado espera', await Promise.race([borrado, esperar(50).then(() => 'esperando')]), 'esperando');
    p2.soltar();
    await ficha;
    comprobar('al terminar, el borrado ve la ficha y responde 409', await borrado, 409);
    comprobar('la especialidad sigue existiendo', Boolean(await db.especialidad.findUnique({ where: { id: pilates.id } })), true);

    // 3) Las dos operaciones reales a la vez, varias veces: nunca terminan ambas bien.
    let ambas = 0;
    for (let i = 0; i < 15; i += 1) {
      const carla = await profesional(`carla${i}`);
      const esp = await especialidad(`QA Carrera ${i}`);
      const [f, d] = await Promise.all([
        estado(profesionales.guardarFicha(carla, datosFicha(esp.nombre))),
        estado(contenido.eliminar('especialidades', esp.id)),
      ]);
      if (f === 'ok' && d === 'ok') ambas += 1;
      const quedo = (await db.profesional.findUnique({ where: { usuarioId: carla } })).especialidad;
      const existe = Boolean(await db.especialidad.findFirst({ where: { nombre: quedo } }));
      assert.equal(existe, true, `vuelta ${i}: la ficha quedó con «${quedo}», que no existe`);
    }
    comprobar('15 vueltas simultáneas: ninguna ficha queda con una especialidad inexistente', ambas, 0);
  } finally {
    await db.usuario.deleteMany({ where: { id: { in: usuarios } } });
    await db.especialidad.deleteMany({ where: { id: { in: especialidades } } });
    const quedan = await db.especialidad.count({ where: { nombre: { contains: String(marca) } } });
    resultado.push(quedan === 0 ? 'OK  se eliminaron los datos temporales' : `ERROR quedaron ${quedan} especialidades`);
    await db.$disconnect();
    console.log(resultado.join('\n'));
    console.log(`${resultado.filter((l) => l.startsWith('OK')).length}/${resultado.length} comprobaciones`);
  }
})().catch((error) => { console.error('FALLÓ:', error.message); process.exitCode = 1; });

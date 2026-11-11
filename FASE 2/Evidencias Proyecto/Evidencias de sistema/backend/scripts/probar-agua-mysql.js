// Regresión real del registro de agua (FS-HU-33) contra MySQL local, con las correcciones de la revisión del PR #48: el
// tope diario con sumas simultáneas y quitar agua de un día anterior desde Comidas. Llama al servicio y al modelo (sin
// sesiones ni HTTP), con cuentas temporales que se eliminan al terminar. Uso: npm run test:mysql:agua
const path = require('node:path');
const assert = require('node:assert/strict');
const base = path.resolve(__dirname, '..');
require(path.join(base, 'node_modules/dotenv')).config({ path: path.join(base, '.env'), quiet: true });
const db = require(path.join(base, 'src/models/prisma'));
const servicio = require(path.join(base, 'src/services/agua.service'));
const modelo = require(path.join(base, 'src/models/agua.model'));

const marca = Date.now();
const resultado = [];
const creados = [];
const comprobar = (caso, real, esperado) => { assert.deepEqual(real, esperado, caso); resultado.push(`OK  ${caso}`); };

async function cuenta(nombre) {
  const rol = await db.rol.findUniqueOrThrow({ where: { nombre: 'usuario' } });
  const usuario = await db.usuario.create({ data: { nombre, correo: `qa.agua.${nombre}.${marca}@example.com`, rolId: rol.id, rolConfirmado: true } });
  creados.push(usuario.id);
  return usuario.id;
}

(async () => {
  try {
    const ana = await cuenta('ana');
    const beto = await cuenta('beto');
    // 03:30 UTC del 05-11 es todavía el 04-11 en Santiago (UTC-3): el día se corta a medianoche de Chile.
    const madrugada = new Date('2026-11-05T02:30:00Z');

    comprobar('sin registros, hoy suma 0', (await servicio.delDia(ana)).totalMl, 0);
    await servicio.agregar(ana, 250);
    const tras = await servicio.agregar(ana, 500);
    comprobar('dos sumas dan 750 ml', tras.totalMl, 750);
    comprobar('cada suma queda como su propia fila', tras.registros.map((r) => r.ml), [250, 500]);
    comprobar('otra cuenta no ve el agua de Ana', (await servicio.delDia(beto)).totalMl, 0);

    const ultimo = tras.registros.at(-1).id;
    await assert.rejects(() => servicio.eliminar(beto, ultimo), (e) => e.estado === 404);
    resultado.push('OK  Beto no puede deshacer una suma de Ana (404)');
    comprobar('deshacer la última deja 250 ml', (await servicio.eliminar(ana, ultimo)).totalMl, 250);

    const noche = await servicio.agregar(beto, 300, null, madrugada);
    comprobar('a las 23:30 de Chile la suma cuenta para el 04-11', noche.fecha, '2026-11-04');
    const antigua = await modelo.agregar(beto, '2026-09-15', 300);
    await assert.rejects(() => servicio.eliminar(beto, antigua[0].id), (e) => e.estado === 404);
    resultado.push('OK  una suma de otro día no se deshace desde hoy (404)');

    // Desde Comidas: se suma al día anterior que se está viendo, y nunca a uno que aún no llega.
    const anterior = await servicio.agregar(ana, 400, '2026-10-20');
    comprobar('desde Comidas se suma a un día anterior', [anterior.fecha, anterior.totalMl], ['2026-10-20', 400]);
    comprobar('ese día no cambia el agua de hoy', (await servicio.delDia(ana)).totalMl, 250);
    await assert.rejects(() => servicio.agregar(ana, 250, '2999-01-01'), (e) => e.estado === 400);
    resultado.push('OK  no se suma a un día que aún no llega (400)');

    // Tope diario: 10.000 ml. Con 9.750 ml, 250 ml más llegan justo al máximo y 50 ml más ya no.
    for (let i = 0; i < 4; i += 1) await modelo.agregar(ana, '2026-10-01', 2000);
    await modelo.agregar(ana, '2026-10-01', 1750);
    comprobar('se puede llegar justo al máximo', (await modelo.agregar(ana, '2026-10-01', 250)).reduce((s, r) => s + r.ml, 0), 10000);
    await assert.rejects(() => modelo.agregar(ana, '2026-10-01', 50),
      (e) => e.estado === 400 && e.message === 'Hoy puedes sumar hasta 0 ml más (el máximo es 10.000 ml al día)');
    resultado.push('OK  pasar el máximo del día no se guarda (400)');

    // Revisión del PR #48: con 9.500 ml, varias sumas simultáneas de 500 ml no pueden pasar de 10.000 ml. Se repite en
    // cinco días con seis solicitudes a la vez, para que la carrera aparezca si el bloqueo faltara.
    let excedidos = 0;
    let guardadasDeMas = 0;
    for (let d = 1; d <= 5; d += 1) {
      const fechaCarrera = `2026-10-0${d}`;
      for (let i = 0; i < 4; i += 1) await modelo.agregar(beto, fechaCarrera, 2000);
      await modelo.agregar(beto, fechaCarrera, 1500);
      const estados = await Promise.all(Array.from({ length: 6 }, () => servicio.agregar(beto, 500, fechaCarrera).then(() => 201, (e) => e.estado)));
      if (estados.filter((e) => e === 201).length !== 1) guardadasDeMas += 1;
      if ((await servicio.delDia(beto, fechaCarrera)).totalMl > 10000) excedidos += 1;
    }
    comprobar('5 días con 6 sumas simultáneas de 500 ml desde 9.500 ml: siempre se guarda una sola', guardadasDeMas, 0);
    comprobar('ningún día pasa de 10.000 ml', excedidos, 0);

    // Revisión del PR #48: desde Comidas se quita una suma propia de un día anterior.
    const delDiaAnterior = (await servicio.delDia(ana, '2026-10-20')).registros[0].id;
    comprobar('desde Comidas se quita una suma de un día anterior', (await servicio.eliminar(ana, delDiaAnterior, '2026-10-20')).totalMl, 0);
    await assert.rejects(() => servicio.eliminar(beto, delDiaAnterior, '2026-10-20'), (e) => e.estado === 404);
    resultado.push('OK  una suma ajena de un día anterior no se quita (404)');

    await assert.rejects(() => db.registroAgua.create({ data: { usuarioId: ana, fecha: new Date('2026-10-02T00:00:00Z'), ml: -5 } }));
    resultado.push('OK  MySQL rechaza una cantidad negativa (CHECK ml > 0)');
  } finally {
    await db.usuario.deleteMany({ where: { id: { in: creados } } });
    const quedan = await db.registroAgua.count({ where: { usuarioId: { in: creados } } });
    resultado.push(quedan === 0 ? 'OK  al borrar las cuentas se borró su agua (cascada)' : `ERROR quedaron ${quedan} registros`);
    await db.$disconnect();
    console.log(resultado.join('\n'));
    console.log(`${resultado.filter((linea) => linea.startsWith('OK')).length}/${resultado.length} comprobaciones`);
  }
})().catch((error) => { console.error('FALLÓ:', error.message); process.exitCode = 1; });

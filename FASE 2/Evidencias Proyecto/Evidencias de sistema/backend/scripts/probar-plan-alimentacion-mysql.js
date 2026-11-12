// Comprobación con MySQL real del plan de alimentación de Comidas (11-11-2026): plan según la meta, lista de planes
// personalizados (crear, usar, editar, borrar), meta de peso con ritmo semanal, validaciones, restricciones de las tablas,
// vigencia por fecha (los días anteriores conservan su plan) y que el resumen del día y las estadísticas usen el plan.
// Crea una cuenta temporal y la borra al final (con sus planes y su meta, por cascada). Uso: npm run test:mysql:plan
const path = require('node:path');
const assert = require('node:assert/strict');
const base = path.resolve(__dirname, '..');
require(path.join(base, 'node_modules/dotenv')).config({ path: path.join(base, '.env'), quiet: true });
const prisma = require(path.join(base, 'src/models/prisma'));
const request = require(path.join(base, 'node_modules/supertest'));
const app = require(path.join(base, 'src/app'));
const { fechaEnChile, sumarDias } = require(path.join(base, 'src/utils/fechaChile'));

const comprobaciones = [];
const api = (metodo, ruta, cuerpo, token) => {
  const peticion = request(app)[metodo](`/api${ruta}`);
  if (token) peticion.set('Authorization', `Bearer ${token}`);
  return peticion.send(cuerpo);
};
async function check(nombre, peticion, estado) {
  const r = await peticion;
  assert.equal(r.status, estado, `${nombre}: ${JSON.stringify(r.body)}`);
  comprobaciones.push(nombre);
  return r.body;
}
const ok = (nombre, condicion) => { assert.ok(condicion, nombre); comprobaciones.push(nombre); };
async function rechaza(nombre, promesa) {
  await assert.rejects(promesa, undefined, nombre);
  comprobaciones.push(nombre);
}

(async () => {
  const sello = Date.now();
  const correo = `qa-plan-${sello}@example.test`;
  const hoy = fechaEnChile();
  const ayer = sumarDias(hoy, -1);
  const dia = (fecha) => new Date(`${fecha}T00:00:00Z`);
  let usuarioId = null;
  try {
    const { token, usuario } = await check('Cuenta temporal', api('post', '/auth/registro', { nombre: 'Prueba Plan', correo, password: `Qa-${sello}-plan` }), 201);
    usuarioId = usuario.id;

    // Perfil vacío (el registro lo crea sin datos): el plan muestra el reparto de referencia, sin calorías.
    const sinPerfil = await check('Plan con el perfil vacío', api('get', '/comidas/plan', undefined, token), 200);
    ok('Con el perfil vacío no hay calorías ni gramos', sinPerfil.plan.kcal === null && sinPerfil.plan.proteinasG === null && sinPerfil.perfil.completo === false);
    ok('La lista de personalizados empieza vacía', sinPerfil.personalizados.length === 0 && sinPerfil.maxPersonalizados === 10);

    // Perfil completo: 70 kg, 165 cm, 30 años, femenino, ligera, bajar de peso → 1.953 kcal de base, 1.660 con −15 %.
    const datosPerfil = { pesoKg: 70, alturaCm: 165, edad: 30, sexo: 'femenino', actividadFisica: 'ligera', objetivoPrincipal: 'bajar_peso' };
    await prisma.perfilUsuario.upsert({ where: { usuarioId }, create: { usuarioId, ...datosPerfil }, update: datosPerfil });
    const meta = await check('Plan según la meta', api('get', '/comidas/plan', undefined, token), 200);
    ok('Calorías de la meta con el ajuste de −15 %', meta.perfil.kcalBase === 1953 && meta.plan.kcal === 1660 && meta.meta.etiqueta === 'Bajar de peso');
    ok('Proteína de 1,8 g por kilo y grasas al 30 %', meta.plan.proteinaGKg === 1.8 && meta.plan.porcentajes.grasas === 30);
    ok('El reparto de la meta suma 100 %', meta.plan.porcentajes.proteinas + meta.plan.porcentajes.carbohidratos + meta.plan.porcentajes.grasas === 100);

    // Cambiar la meta en el perfil cambia el plan sin guardar nada.
    await prisma.perfilUsuario.update({ where: { usuarioId }, data: { objetivoPrincipal: 'aumentar_masa' } });
    const masa = await check('Plan al cambiar la meta del perfil', api('get', '/comidas/plan', undefined, token), 200);
    ok('Aumentar masa suma 10 % a las calorías y usa 2 g por kilo', masa.plan.kcal === 2148 && masa.plan.proteinaGKg === 2);
    await prisma.perfilUsuario.update({ where: { usuarioId }, data: { objetivoPrincipal: 'bajar_peso' } });

    // Lista de personalizados.
    const nuevo = (nombre, proteinas, carbohidratos, grasas, usar) => api('post', '/comidas/plan/personalizados', { nombre, proteinas, carbohidratos, grasas, usar }, token);
    await check('Rechaza porcentajes que no suman 100', nuevo('Malo', 40, 40, 25), 400);
    await check('Rechaza un porcentaje sobre 80', nuevo('Malo', 10, 85, 5), 400);
    await check('Rechaza un plan sin nombre', nuevo('   ', 30, 40, 30), 400);
    ok('Lo rechazado no se guarda', (await prisma.planPersonalizado.count({ where: { usuarioId } })) === 0);
    const conDescanso = await check('Crea un personalizado sin usarlo', nuevo('Días de descanso', 30, 40, 30, false), 201);
    ok('Queda en la lista y el plan sigue siendo el de la meta', conDescanso.personalizados.length === 1 && conDescanso.plan.tipo === 'meta');
    await check('Un nombre repetido (sin importar mayúsculas ni tildes) responde 409', nuevo('DIAS DE DESCANSO', 30, 40, 30), 409);

    // Un plan de ayer y otro de hoy: cada día conserva el suyo.
    await prisma.planAlimentacion.create({ data: { usuarioId, desde: dia(ayer), tipo: 'personalizado', proteinasPct: 20, carbohidratosPct: 50, grasasPct: 30 } });
    const volumen = await check('Crea un personalizado y lo usa desde hoy', nuevo('Volumen', 40, 35, 25, true), 201);
    const idVolumen = volumen.plan.personalizadoId;
    const idDescanso = volumen.personalizados.find((p) => p.nombre === 'Días de descanso').id;
    ok('Rige desde hoy con su nombre y las calorías de la meta', volumen.plan.desde === hoy && volumen.plan.nombre === 'Volumen' && volumen.plan.kcal === 1660 && volumen.plan.proteinasG === 166);
    ok('La lista marca cuál está en uso', volumen.personalizados.filter((p) => p.enUso).map((p) => p.nombre).join() === 'Volumen');
    const cambio = await check('Cambia a otro personalizado de la lista', api('put', '/comidas/plan', { tipo: 'personalizado', personalizadoId: idDescanso }, token), 200);
    ok('El plan de hoy pasa a «Días de descanso»', cambio.plan.nombre === 'Días de descanso' && cambio.plan.porcentajes.proteinas === 30);
    await check('Vuelve a «Volumen»', api('put', '/comidas/plan', { tipo: 'personalizado', personalizadoId: idVolumen }, token), 200);
    ok('Cambiar varias veces el mismo día deja una fila por día', (await prisma.planAlimentacion.count({ where: { usuarioId } })) === 2);

    const editado = await check('Edita el plan en uso', api('put', `/comidas/plan/personalizados/${idVolumen}`, { nombre: 'Volumen', proteinas: 35, carbohidratos: 40, grasas: 25 }, token), 200);
    ok('Desde hoy rige con los porcentajes nuevos', editado.plan.porcentajes.proteinas === 35 && editado.plan.proteinasG === 145);

    const resumenHoy = await check('Resumen de hoy', api('get', '/comidas', undefined, token), 200);
    ok('El resumen de hoy usa el plan de hoy', resumenHoy.objetivo.plan.tipo === 'personalizado' && resumenHoy.objetivo.proteinasG === 145);
    const resumenAyer = await check('Resumen de ayer', api('get', `/comidas?fecha=${ayer}`, undefined, token), 200);
    ok('El resumen de ayer conserva el plan de ayer', resumenAyer.objetivo.plan.porcentajes.proteinas === 20 && resumenAyer.objetivo.proteinasG === 83);
    const antes = await check('Resumen de anteayer', api('get', `/comidas?fecha=${sumarDias(hoy, -2)}`, undefined, token), 200);
    ok('Antes del primer plan rige el de la meta', antes.objetivo.plan.tipo === 'meta' && antes.objetivo.plan.porcentajes.proteinas === meta.plan.porcentajes.proteinas);
    const estadisticas = await check('Estadísticas de la semana', api('get', '/comidas/estadisticas', undefined, token), 200);
    ok('Las estadísticas usan el plan vigente', estadisticas.objetivo.calorias === 1660 && estadisticas.objetivo.proteinasG === 145);

    // Estadísticas ampliadas (11-11-2026): período anterior, días cerca de la meta y calorías de cada comida del día, con
    // la agrupación por momento en MySQL. Ayer: 1.600 kcal (96 % de 1.660); una semana antes: 900 kcal (54 %).
    const comida = (fecha, momento, calorias) => ({
      usuarioId, fecha: dia(fecha), momento, descripcionAlimento: 'Comida de prueba', gramos: 100, calorias, proteinasG: 10, carbohidratosG: 20, grasasG: 5,
    });
    await prisma.registroComida.createMany({ data: [comida(ayer, 'almuerzo', 1200), comida(ayer, 'cena', 400), comida(sumarDias(ayer, -7), 'desayuno', 900)] });
    const ampliadas = await check('Estadísticas de la semana de ayer', api('get', `/comidas/estadisticas?fecha=${ayer}`, undefined, token), 200);
    ok('Ayer cuenta como día completo y cerca de la meta', ampliadas.diasConRegistros === 1 && ampliadas.diasCompletos === 1 && ampliadas.diasCerca === 1);
    ok('Trae la semana anterior para comparar', ampliadas.anterior.diasConRegistros === 1 && ampliadas.anterior.promedio.calorias === 900 && ampliadas.anterior.diasCerca === 0);
    const porMomento = Object.fromEntries(ampliadas.momentos.map(({ momento, calorias, porcentaje }) => [momento, [calorias, porcentaje]]));
    ok('Reparte las calorías por comida del día', porMomento.almuerzo[0] === 1200 && porMomento.almuerzo[1] === 75 && porMomento.cena[1] === 25 && porMomento.desayuno[0] === 0);
    ok('Trae el reparto del plan', ampliadas.objetivo.porcentajes && ampliadas.objetivo.porcentajes.proteinas + ampliadas.objetivo.porcentajes.carbohidratos + ampliadas.objetivo.porcentajes.grasas === 100);

    // Borrar el plan en uso: desde hoy vuelve el de la meta; los días pasados conservan su copia.
    const borrado = await check('Borra el plan en uso', api('delete', `/comidas/plan/personalizados/${idVolumen}`, undefined, token), 200);
    ok('Desde hoy vuelve el plan de la meta', borrado.plan.tipo === 'meta' && borrado.personalizados.length === 1);
    const deHoy = await prisma.planAlimentacion.findFirst({ where: { usuarioId, desde: dia(hoy) } });
    ok('La fila de hoy queda como meta y sin porcentajes', deHoy.tipo === 'meta' && deHoy.proteinasPct === null && deHoy.planPersonalizadoId === null);
    await check('Un plan ajeno o borrado responde 404', api('put', '/comidas/plan', { tipo: 'personalizado', personalizadoId: idVolumen }, token), 404);

    // Meta de peso: de 70 a 64 kg a 0,5 kg por semana → 550 kcal menos al día (1.953 − 550 = 1.403 kcal).
    await check('Rechaza un peso bajo un IMC de 18,5', api('put', '/comidas/plan/meta-peso', { pesoObjetivoKg: 48, ritmoSemanalKg: 0.5 }, token), 400);
    await check('Rechaza un peso mayor al actual para bajar', api('put', '/comidas/plan/meta-peso', { pesoObjetivoKg: 72, ritmoSemanalKg: 0.5 }, token), 400);
    const conMeta = await check('Guarda la meta de peso', api('put', '/comidas/plan/meta-peso', { pesoObjetivoKg: 64, ritmoSemanalKg: 0.5 }, token), 200);
    ok('Las calorías siguen el ritmo elegido', conMeta.plan.kcal === 1403 && conMeta.meta.ajusteKcal === -550);
    ok('Faltan 6 kg: 12 semanas al ritmo elegido', conMeta.metaPeso.faltanKg === 6 && conMeta.metaPeso.semanas === 12 && conMeta.metaPeso.fechaEstimada === sumarDias(hoy, 84));
    await prisma.perfilUsuario.update({ where: { usuarioId }, data: { pesoKg: 67 } });
    const avance = await check('Avance tras bajar 3 kg', api('get', '/comidas/plan', undefined, token), 200);
    ok('Lleva el 50 % de la meta', avance.metaPeso.avancePct === 50 && avance.metaPeso.pesoInicialKg === 70);
    await check('Ajustar la meta conserva el punto de partida', api('put', '/comidas/plan/meta-peso', { pesoObjetivoKg: 65, ritmoSemanalKg: 0.25 }, token), 200);
    ok('El punto de partida sigue en 70 kg', Number((await prisma.metaPeso.findUnique({ where: { usuarioId } })).pesoInicialKg) === 70);
    await prisma.perfilUsuario.update({ where: { usuarioId }, data: { objetivoPrincipal: 'mantener_peso' } });
    const otraMeta = await check('Plan con otra meta en el perfil', api('get', '/comidas/plan', undefined, token), 200);
    ok('La meta de peso deja de aplicarse si cambia la meta del perfil', otraMeta.metaPeso.aplica === false && otraMeta.plan.kcal === otraMeta.perfil.kcalBase);
    await check('Quita la meta de peso', api('delete', '/comidas/plan/meta-peso', undefined, token), 200);
    ok('La meta de peso se borró', (await prisma.metaPeso.count({ where: { usuarioId } })) === 0);

    // Restricciones de las tablas (por si alguien escribe sin pasar por la API).
    await rechaza('La tabla rechaza porcentajes que no suman 100', prisma.$executeRaw`INSERT INTO planes_alimentacion (usuario_id, desde, tipo, proteinas_pct, carbohidratos_pct, grasas_pct) VALUES (${usuarioId}, '2020-01-01', 'personalizado', 50, 30, 30)`);
    await rechaza('La tabla rechaza un plan de meta con porcentajes', prisma.$executeRaw`INSERT INTO planes_alimentacion (usuario_id, desde, tipo, proteinas_pct, carbohidratos_pct, grasas_pct) VALUES (${usuarioId}, '2020-01-01', 'meta', 30, 45, 25)`);
    await rechaza('La tabla rechaza un tipo desconocido', prisma.$executeRaw`INSERT INTO planes_alimentacion (usuario_id, desde, tipo) VALUES (${usuarioId}, '2020-01-01', 'estandar')`);
    await rechaza('La tabla no acepta dos planes el mismo día', prisma.planAlimentacion.create({ data: { usuarioId, desde: dia(ayer), tipo: 'meta' } }));
    await rechaza('La lista rechaza porcentajes que no suman 100', prisma.$executeRaw`INSERT INTO planes_personalizados (usuario_id, nombre, proteinas_pct, carbohidratos_pct, grasas_pct) VALUES (${usuarioId}, 'Raro', 50, 30, 30)`);
    await rechaza('La meta de peso rechaza un peso objetivo en la dirección contraria', prisma.$executeRaw`INSERT INTO metas_peso (usuario_id, objetivo, peso_inicial_kg, peso_objetivo_kg, ritmo_semanal_kg, fecha_inicio) VALUES (${usuarioId}, 'bajar_peso', 70, 75, 0.5, '2026-11-11')`);

    await prisma.usuario.delete({ where: { id: usuarioId } });
    const quedan = await Promise.all([prisma.planAlimentacion.count({ where: { usuarioId } }), prisma.planPersonalizado.count({ where: { usuarioId } })]);
    ok('Al borrar la cuenta se borran sus planes y su lista', quedan.every((total) => total === 0));
    usuarioId = null;

    console.log(JSON.stringify({ mysqlReal: true, total: comprobaciones.length, comprobaciones, limpieza: 'Solo la cuenta temporal qa-plan-*@example.test, sus planes y su meta' }, null, 1));
  } finally {
    if (usuarioId) await prisma.usuario.deleteMany({ where: { id: usuarioId } });
    await prisma.$disconnect();
  }
})().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});

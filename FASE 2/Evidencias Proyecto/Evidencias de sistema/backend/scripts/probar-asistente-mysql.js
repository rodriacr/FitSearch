const path = require('node:path');
const fs = require('node:fs');
const assert = require('node:assert/strict');
// Regresión real del cupo diario (PR #29): solo crea una cuenta temporal y la elimina con sus conversaciones.
// SC-47: también la modalidad y el orden de la recomendación, el resumen del día, la valoración de las respuestas y el
// permiso para usar el perfil, con las restricciones CHECK de la migración 20261126120000/20261126130000.
// El proveedor es simulado: no envía mensajes a Groq ni consume una clave externa.
// La evidencia de Plan de Pruebas solo se reescribe con --guardar-evidencia.
const base = path.resolve(__dirname, '..');
const EVIDENCIA = path.resolve(__dirname, '../../../Evidencias de documentación/Plan de Pruebas/Asistente_Cupo_MySQL_2026-10-23.json');
const guardarEvidencia = process.argv.includes('--guardar-evidencia');
require(path.join(base, 'node_modules/dotenv')).config({ path: path.join(base, '.env'), quiet: true });
let db;
let fixtureUser;
const fixtureEmail = `qa.cupo.${Date.now()}@example.com`;
const evidence = { fecha: new Date().toISOString(), alcance: 'API Express y modelo reales contra MySQL local; cuenta temporal propia; proveedor IA simulado; sin modificar cuentas existentes', casos: [] };
function check(name, actual, expected) { assert.deepEqual(actual, expected, name); evidence.casos.push({ caso: name, resultado: actual }); }
(async () => {
 try {
  process.env.IA_API_KEY = '';
  process.env.IA_MENSAJES_POR_DIA = '30';
  db = require(path.join(base, 'src/models/prisma'));
  const request = require(path.join(base, 'node_modules/supertest'));
  const jwt = require(path.join(base, 'node_modules/jsonwebtoken'));
  const app = require(path.join(base, 'src/app'));
  const model = require(path.join(base, 'src/models/asistente.model'));
  const provider = require(path.join(base, 'src/services/proveedorIa.service'));
  const service = require(path.join(base, 'src/services/asistente.service'));
  const config = require(path.join(base, 'src/config/env'));
  const rol = await db.rol.findUniqueOrThrow({ where: { nombre: 'usuario' } });
  const user = await db.usuario.create({ data: { nombre: 'Prueba temporal de cupo', correo: fixtureEmail, rolId: rol.id, rolConfirmado: true } });
  fixtureUser = user.id;
  const token = jwt.sign({ rol: 'usuario', versionSesion: 0 }, config.jwtSecreto, { subject: String(user.id), expiresIn: '10m' });
  const today = service.fechaEnChile();
  const day = new Date(today+'T00:00:00Z');
  const yesterday = new Date(+day-86400000);
  const tomorrow = new Date(+day+86400000);
  const actualUsage = async () => (await db.usoAsistente.findUnique({ where: { usuarioId: user.id } })).mensajes;
  const setUsage = async (messages, date=day) => db.usoAsistente.upsert({ where: { usuarioId: user.id }, create: { usuarioId: user.id, fecha: date, mensajes: messages }, update: { fecha: date, mensajes: messages } });
  let calls = 0;
  let failProvider = false;
  provider.responder = async () => { calls++; await new Promise(r=>setTimeout(r,40)); if (failProvider) throw new (require(path.join(base,'src/utils/ErrorHttp')))(503,'Fallo simulado'); return { contenido: 'Respuesta de prueba', especialidad: null }; };
  const start = () => request(app).post('/api/asistente/conversaciones').set('Authorization','Bearer '+token).send({ mensaje: 'Consulta de prueba' });
  const send = id => request(app).post(`/api/asistente/conversaciones/${id}/mensajes`).set('Authorization','Bearer '+token).send({ mensaje: 'Otra consulta de prueba' });
  const statuses = rs => rs.map(r=>r.status).sort((a,b)=>a-b);
  await setUsage(29);
  let result = await Promise.all([start(),start(),start()]);
  check('Iniciar tres conversaciones con un cupo',statuses(result),[201,429,429]);
  check('Un solo llamado al proveedor',calls,1);
  check('Contador final al iniciar',await actualUsage(),30);
  const conversation = result.find(r=>r.status===201).body.conversacion.id;
  await setUsage(29); calls=0;
  result=await Promise.all([send(conversation),send(conversation),send(conversation)]);
  check('Continuar tres mensajes con un cupo',statuses(result),[201,429,429]);
  check('Contador final al continuar',await actualUsage(),30);
  check('Solo una consulta al continuar',calls,1);
  await setUsage(29); calls=0;
  result=await Promise.all([start(),send(conversation),start()]);
  check('Solicitudes mixtas con un cupo',statuses(result),[201,429,429]);
  check('Contador final mixto',await actualUsage(),30);
  await db.usoAsistente.delete({where:{usuarioId:user.id}});
  result=await Promise.all([start(),start(),start()]);
  check('Primer uso concurrente',statuses(result),[201,201,201]);
  check('Primer uso no pierde consumos',await actualUsage(),3);
  await setUsage(29,yesterday);
  result=await Promise.all([start(),start(),start()]);
  check('Reinicio del día concurrente',statuses(result),[201,201,201]);
  check('Reinicio conserva los tres consumos',await actualUsage(),3);
  await setUsage(29); failProvider=true;
  check('Fallo del proveedor responde 503',(await start()).status,503);
  check('Fallo devuelve el cupo',await actualUsage(),29);
  failProvider=false;
  check('Reintento usa el cupo',(await start()).status,201);
  check('Reintento termina en 30',await actualUsage(),30);
  calls=0;
  check('Cupo agotado rechaza antes del proveedor',(await start()).status,429);
  check('Cupo agotado no llama al proveedor',calls,0);
  await setUsage(29);
  const guardar = model.agregarMensajes;
  model.agregarMensajes = async () => { throw new (require(path.join(base,'src/utils/ErrorHttp')))(503,'Fallo de guardado simulado'); };
  check('Fallo de guardado responde 503',(await send(conversation)).status,503);
  check('Fallo de guardado devuelve el cupo',await actualUsage(),29);
  model.agregarMensajes = guardar;
  await setUsage(7,tomorrow);
  await model.liberarUso(user.id,today);
  check('Devolución anterior no afecta otro día',await actualUsage(),7);
  // Una solicitud iniciada antes de medianoche puede llegar a reservar después de otra del día nuevo.
  const oldRequest = await model.reservarUso(user.id,today,30);
  const current = await db.usoAsistente.findUnique({where:{usuarioId:user.id}});
  evidence.solicitudDeDiaAnterior={aceptada:oldRequest,fechaFinal:current.fecha.toISOString().slice(0,10),consumosFinales:current.mensajes,esperado:{aceptada:false,fechaFinal:tomorrow.toISOString().slice(0,10),consumosFinales:7}};
  check('Solicitud anterior no reinicia el día nuevo',oldRequest,false);
  check('Solicitud anterior conserva el contador nuevo',{fecha:current.fecha.toISOString().slice(0,10),mensajes:current.mensajes},{fecha:tomorrow.toISOString().slice(0,10),mensajes:7});
  // SC-47: mejora del asistente contra MySQL real.
  const auth = (r) => r.set('Authorization','Bearer '+token);
  await setUsage(0);
  provider.responder = async () => ({ contenido: 'Te conviene un kinesiólogo.', especialidad: 'Kinesiología' });
  let res = await auth(request(app).post('/api/asistente/conversaciones')).send({ mensaje: 'Me duele la rodilla, busco alguien cerca de mi casa' });
  const recomendada = await db.mensaje.findFirst({ where: { conversacionId: res.body.conversacion.id, remitente: 'asistente' } });
  check('SC-47 guarda la especialidad, la modalidad y el orden pedidos', { e: recomendada.especialidad, m: recomendada.modalidad, c: recomendada.criterio }, { e: 'Kinesiología', m: 'presencial', c: 'cercania' });
  res = await auth(request(app).patch(`/api/asistente/mensajes/${recomendada.id}`)).send({ modalidad: 'online', criterio: 'cercania' });
  check('SC-47 online no se ordena por cercanía', res.status, 400);
  res = await auth(request(app).patch(`/api/asistente/mensajes/${recomendada.id}`)).send({ modalidad: 'online', criterio: 'calificacion', valoracion: 1 });
  const elegida = await db.mensaje.findUnique({ where: { id: recomendada.id } });
  check('SC-47 guarda lo elegido en la tarjeta y la valoración', { s: res.status, m: elegida.modalidad, c: elegida.criterio, v: elegida.valoracion }, { s: 200, m: 'online', c: 'calificacion', v: 1 });
  const sinRecomendacion = await db.mensaje.findFirst({ where: { conversacionId: conversation, remitente: 'asistente' } });
  check('SC-47 sin recomendación no acepta modalidad', (await auth(request(app).patch(`/api/asistente/mensajes/${sinRecomendacion.id}`)).send({ modalidad: 'online' })).status, 409);
  const otroCheck = async (cambio) => { try { await cambio(); return 'aceptado'; } catch { return 'rechazado'; } };
  check('SC-47 MySQL rechaza una valoración fuera de 1 y -1', await otroCheck(() => db.mensaje.update({ where: { id: recomendada.id }, data: { valoracion: 5 } })), 'rechazado');
  check('SC-47 MySQL rechaza una modalidad desconocida', await otroCheck(() => db.mensaje.update({ where: { id: recomendada.id }, data: { modalidad: 'domicilio' } })), 'rechazado');
  provider.responder = async () => ({ resumen: true });
  res = await auth(request(app).post(`/api/asistente/conversaciones/${conversation}/mensajes`)).send({ mensaje: '¿Cómo voy hoy?' });
  const resumen = await db.mensaje.findFirst({ where: { conversacionId: conversation, remitente: 'asistente' }, orderBy: { id: 'desc' } });
  check('SC-47 guarda el resumen del día con el consumo real (cuenta sin comidas)', { s: res.status, kcal: resumen.resumenDia?.calorias?.consumo, agua: resumen.resumenDia?.aguaMl?.consumo }, { s: 201, kcal: 0, agua: 0 });
  res = await auth(request(app).put('/api/asistente/permiso-perfil')).send({ permiso: 'perfil_salud' });
  const conPermiso = await db.usuario.findUnique({ where: { id: user.id }, select: { permisoPerfilIa: true, permisoPerfilIaFecha: true } });
  check('SC-47 guarda el permiso para usar el perfil y su fecha', { s: res.status, p: conPermiso.permisoPerfilIa, conFecha: conPermiso.permisoPerfilIaFecha instanceof Date }, { s: 200, p: 'perfil_salud', conFecha: true });
  check('SC-47 MySQL rechaza un permiso desconocido', await otroCheck(() => db.usuario.update({ where: { id: user.id }, data: { permisoPerfilIa: 'todo' } })), 'rechazado');
  const datos = (await auth(request(app).get('/api/perfil/mis-datos'))).body;
  const exportados = datos?.asistente?.conversaciones?.flatMap((c) => c.mensajes) ?? [];
  check('SC-47 Mis datos incluye el permiso, la valoración y el resumen', {
    permiso: datos?.cuenta?.preferencias?.asistenteUsaPerfil?.permiso ?? datos?.preferencias?.asistenteUsaPerfil?.permiso,
    valorada: exportados.some((m) => m.valoracion === 1), resumen: exportados.some((m) => m.resumenDia),
  }, { permiso: 'perfil_salud', valorada: true, resumen: true });
  evidence.resultado='COMPROBADO';
 } catch(e) {
  evidence.resultado='ERROR'; evidence.error=e.code||e.message; process.exitCode=1;
 } finally {
  if(db && fixtureUser){const removed=await db.usuario.deleteMany({where:{id:fixtureUser,correo:fixtureEmail}});evidence.cuentaTemporalEliminada=removed.count===1;}
  if(db)await db.$disconnect();
  if(guardarEvidencia)fs.writeFileSync(EVIDENCIA,JSON.stringify(evidence,null,2));
  console.log(JSON.stringify(evidence,null,2));
  console.log(guardarEvidencia?`Evidencia guardada en ${EVIDENCIA}`:'Evidencia no guardada (usa --guardar-evidencia para reescribirla).');
 }
})();

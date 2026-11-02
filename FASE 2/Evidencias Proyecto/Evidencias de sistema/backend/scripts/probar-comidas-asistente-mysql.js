const path = require('node:path');
const fs = require('node:fs');
const assert = require('node:assert/strict');
// Revisión del PR #35: los alimentos pedidos en el chat y los mensajes se guardan en una sola transacción de MySQL.
// Solo crea una cuenta temporal y la elimina con sus comidas y conversaciones. El proveedor es simulado (no consulta
// Groq) y los fallos de guardado son inducidos.
const base = path.resolve(__dirname, '..');
require(path.join(base, 'node_modules/dotenv')).config({ path: path.join(base, '.env'), quiet: true });
let db;
let usuarioTemporal;
const correoTemporal = `qa.comidas.${Date.now()}@example.com`;
const evidencia = {
  fecha: new Date().toISOString(),
  alcance: 'API Express, servicios y modelos reales contra MySQL local; cuenta temporal propia; proveedor IA simulado; fallos de guardado inducidos',
  casos: [],
};
function comprobar(caso, real, esperado) { assert.deepEqual(real, esperado, caso); evidencia.casos.push({ caso, resultado: real }); }

(async () => {
  try {
    process.env.IA_API_KEY = '';
    process.env.IA_MENSAJES_POR_DIA = '30';
    db = require(path.join(base, 'src/models/prisma'));
    const request = require(path.join(base, 'node_modules/supertest'));
    const jwt = require(path.join(base, 'node_modules/jsonwebtoken'));
    const app = require(path.join(base, 'src/app'));
    const asistenteModelo = require(path.join(base, 'src/models/asistente.model'));
    const comidaModelo = require(path.join(base, 'src/models/comida.model'));
    const proveedor = require(path.join(base, 'src/services/proveedorIa.service'));
    const ErrorHttp = require(path.join(base, 'src/utils/ErrorHttp'));
    const config = require(path.join(base, 'src/config/env'));

    const rol = await db.rol.findUniqueOrThrow({ where: { nombre: 'usuario' } });
    const usuario = await db.usuario.create({ data: { nombre: 'Prueba temporal de comidas', correo: correoTemporal, rolId: rol.id, rolConfirmado: true } });
    usuarioTemporal = usuario.id;
    const token = jwt.sign({ rol: 'usuario', versionSesion: 0 }, config.jwtSecreto, { subject: String(usuario.id), expiresIn: '10m' });

    proveedor.responder = async () => ({ pedido: { alimentos: [{ nombre: 'arroz', gramos: 150 }, { nombre: 'pollo', gramos: 100 }], momento: 'almuerzo' } });
    const PEDIDO = 'Agrega 150 g de arroz y 100 g de pollo al almuerzo';
    const iniciar = () => request(app).post('/api/asistente/conversaciones').set('Authorization', `Bearer ${token}`).send({ mensaje: PEDIDO });
    const continuar = (id) => request(app).post(`/api/asistente/conversaciones/${id}/mensajes`).set('Authorization', `Bearer ${token}`).send({ mensaje: PEDIDO });
    const comidas = () => db.registroComida.count({ where: { usuarioId: usuario.id } });
    const conversaciones = () => db.conversacion.count({ where: { usuarioId: usuario.id } });
    const mensajesDe = (id) => db.mensaje.count({ where: { conversacionId: id } });
    const uso = async () => (await db.usoAsistente.findUnique({ where: { usuarioId: usuario.id } }))?.mensajes ?? 0;
    const falla = () => { throw new ErrorHttp(503, 'Fallo de guardado simulado'); };

    // 1. Falla crear la conversación después de agregar los alimentos.
    const crearConversacion = asistenteModelo.crearConversacion;
    asistenteModelo.crearConversacion = falla;
    comprobar('Fallo al crear la conversación responde 503', (await iniciar()).status, 503);
    comprobar('Sin comidas guardadas tras el fallo al crear', await comidas(), 0);
    comprobar('Sin conversación creada', await conversaciones(), 0);
    comprobar('El cupo se devuelve', await uso(), 0);
    asistenteModelo.crearConversacion = crearConversacion;
    const creada = await iniciar();
    comprobar('El reintento crea la conversación', creada.status, 201);
    comprobar('El reintento guarda los dos alimentos una sola vez', await comidas(), 2);
    const ids = creada.body.mensajes[1].comidasAgregadas.map(({ id }) => id);
    comprobar('Los ids de comidasAgregadas existen en registro_comida', await db.registroComida.count({ where: { id: { in: ids }, usuarioId: usuario.id, origen: 'asistente' } }), 2);
    const conversacion = creada.body.conversacion.id;

    // 2. Falla guardar los mensajes al continuar una conversación existente.
    const agregarMensajes = asistenteModelo.agregarMensajes;
    asistenteModelo.agregarMensajes = falla;
    comprobar('Fallo al continuar responde 503', (await continuar(conversacion)).status, 503);
    comprobar('Las comidas no cambian tras el fallo al continuar', await comidas(), 2);
    comprobar('La conversación conserva sus 2 mensajes', await mensajesDe(conversacion), 2);
    asistenteModelo.agregarMensajes = agregarMensajes;
    comprobar('El reintento al continuar responde 201', (await continuar(conversacion)).status, 201);
    comprobar('El reintento suma solo 2 comidas', await comidas(), 4);
    comprobar('La conversación queda con 4 mensajes', await mensajesDe(conversacion), 4);

    // 3. Falla el segundo alimento: el primero tampoco debe quedar.
    const crear = comidaModelo.crear;
    let llamadas = 0;
    comidaModelo.crear = (datos, tx) => { llamadas += 1; return llamadas === 2 ? falla() : crear(datos, tx); };
    comprobar('Fallo del segundo alimento responde 503', (await iniciar()).status, 503);
    comprobar('El primer alimento no queda guardado', await comidas(), 4);
    comprobar('No se crea otra conversación', await conversaciones(), 1);
    comidaModelo.crear = crear;
    comprobar('El reintento guarda los dos alimentos', (await iniciar()).status, 201);
    comprobar('Total final de comidas', await comidas(), 6);
    comprobar('Mensajes usados: solo las 3 respuestas guardadas', await uso(), 3);
    evidencia.resultado = 'COMPROBADO';
  } catch (error) {
    evidencia.resultado = 'ERROR';
    evidencia.error = error.code || error.message;
    process.exitCode = 1;
  } finally {
    if (db && usuarioTemporal) {
      const eliminada = await db.usuario.deleteMany({ where: { id: usuarioTemporal, correo: correoTemporal } });
      evidencia.cuentaTemporalEliminada = eliminada.count === 1;
      evidencia.comidasTemporalesRestantes = await db.registroComida.count({ where: { usuarioId: usuarioTemporal } });
    }
    if (db) await db.$disconnect();
    fs.writeFileSync(path.resolve(__dirname, '../../../Evidencias de documentación/Plan de Pruebas/Comidas_Transaccion_MySQL_2026-10-27.json'), JSON.stringify(evidencia, null, 2));
    console.log(JSON.stringify(evidencia, null, 2));
  }
})();

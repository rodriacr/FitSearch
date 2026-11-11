// Comprobación con MySQL real de todo lo que usa el correo y las cuentas de Google (11-11-2026): registro, inicio de
// sesión, recuperación de contraseña, cuentas creadas con Google, cuentas desactivadas, cierre de sesión y el acceso con
// Google. El correo se simula (se captura el enlace de recuperación, nada sale) y las cuentas temporales se borran al
// final. Uso: npm run test:mysql:acceso
const path = require('node:path');
const assert = require('node:assert/strict');
const base = path.resolve(__dirname, '..');
require(path.join(base, 'node_modules/dotenv')).config({ path: path.join(base, '.env'), quiet: true });
process.env.SMTP_USUARIO = '';
process.env.SMTP_CONTRASENA = '';
const prisma = require(path.join(base, 'src/models/prisma'));
const request = require(path.join(base, 'node_modules/supertest'));
const app = require(path.join(base, 'src/app'));
const correo = require(path.join(base, 'src/services/correo.service'));
const google = require(path.join(base, 'src/services/google.service'));

// Correo simulado: guarda cada enlace de recuperación por destinatario.
const enlaces = [];
correo.enviarRecuperacion = async ({ para, enlace }) => { enlaces.push({ para, enlace }); };
const ultimoToken = (para) => new URL(enlaces.filter((e) => e.para === para).at(-1).enlace).searchParams.get('token');
const esperar = (ms) => new Promise((listo) => { setTimeout(listo, ms); });

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

(async () => {
  const sello = Date.now();
  const correoPrueba = `qa-acceso-${sello}@example.test`;
  const correoGoogle = `qa-acceso-google-${sello}@example.test`;
  const clave = `Qa-${sello}-uno`;
  const nueva = `Qa-${sello}-dos`;
  try {
    // Registro e inicio de sesión: el correo se guarda sin espacios y en minúsculas.
    const registro = await check('Registro con correo', api('post', '/auth/registro', { nombre: 'Prueba Acceso', correo: `  ${correoPrueba.toUpperCase()} `, password: clave }), 201);
    ok('El correo queda en minúsculas', registro.usuario.correo === correoPrueba);
    await check('Un correo repetido no crea otra cuenta', api('post', '/auth/registro', { nombre: 'Otra', correo: correoPrueba, password: clave }), 409);
    await check('Un correo inválido se rechaza', api('post', '/auth/registro', { nombre: 'Otra', correo: 'sin-arroba', password: clave }), 400);
    const sesion = await check('Inicio de sesión con mayúsculas en el correo', api('post', '/auth/login', { correo: correoPrueba.toUpperCase(), password: clave }), 200);
    await check('Inicio de sesión con «Recordarme»', api('post', '/auth/login', { correo: correoPrueba, password: clave, recordar: true }), 200);
    await check('Contraseña incorrecta', api('post', '/auth/login', { correo: correoPrueba, password: 'otra-cosa-123' }), 401);

    // La sesión es un JWT sin estado: cerrar sesión responde 204 y el frontend descarta el token.
    await check('El perfil responde con la sesión', api('get', '/perfil', undefined, sesion.token), 200);
    await check('Cerrar sesión', api('post', '/auth/logout', undefined, sesion.token), 204);

    // Recuperación de contraseña: mismo mensaje exista o no la cuenta; el enlace sirve una vez y el nuevo reemplaza al anterior.
    const respuesta = await check('Pedir recuperación (correo con mayúsculas)', api('post', '/auth/recuperar', { correo: correoPrueba.toUpperCase() }), 200);
    const ajena = await check('Pedir recuperación de un correo sin cuenta', api('post', '/auth/recuperar', { correo: `nadie-${sello}@example.test` }), 200);
    await esperar(300);
    ok('Mismo mensaje con y sin cuenta', respuesta.mensaje === ajena.mensaje);
    ok('Solo la cuenta existente recibe el enlace', enlaces.length === 1 && enlaces[0].para === correoPrueba);
    const enlace = new URL(enlaces[0].enlace);
    ok('El enlace abre la pantalla de restablecer del frontend', enlace.pathname === '/restablecer-contrasena' && /^[a-f0-9]{64}$/.test(enlace.searchParams.get('token')));
    const primero = ultimoToken(correoPrueba);
    await check('Pedir otro enlace', api('post', '/auth/recuperar', { correo: correoPrueba }), 200);
    await esperar(300);
    await check('El enlace anterior deja de servir', api('post', '/auth/restablecer', { token: primero, password: nueva }), 400);
    const segundo = ultimoToken(correoPrueba);
    await check('Contraseña nueva demasiado corta', api('post', '/auth/restablecer', { token: segundo, password: 'corta' }), 400);
    await check('Restablecer con el enlace vigente', api('post', '/auth/restablecer', { token: segundo, password: nueva }), 200);
    await check('El enlace no sirve dos veces', api('post', '/auth/restablecer', { token: segundo, password: `${nueva}-x` }), 400);
    await check('La contraseña anterior ya no entra', api('post', '/auth/login', { correo: correoPrueba, password: clave }), 401);
    await check('La contraseña nueva entra', api('post', '/auth/login', { correo: correoPrueba, password: nueva }), 200);
    await check('Restablecer la contraseña cierra las sesiones abiertas', api('get', '/perfil', undefined, sesion.token), 401);
    await check('Pedir un enlace que vencerá', api('post', '/auth/recuperar', { correo: correoPrueba }), 200);
    await esperar(300);
    await prisma.tokenRecuperacion.updateMany({ where: { usuario: { correo: correoPrueba } }, data: { fechaExpiracion: new Date(Date.now() - 60000) } });
    await check('Un enlace vencido no sirve', api('post', '/auth/restablecer', { token: ultimoToken(correoPrueba), password: `${nueva}-y` }), 400);

    // Cuenta creada con Google (sin contraseña): no entra con contraseña, pero puede crear una con la recuperación.
    const rol = await prisma.rol.findUnique({ where: { nombre: 'usuario' } });
    await prisma.usuario.create({ data: { nombre: 'Prueba Google', correo: correoGoogle, googleId: `qa-${sello}`, rolId: rol.id } });
    await check('Una cuenta de Google no entra con una contraseña inventada', api('post', '/auth/login', { correo: correoGoogle, password: clave }), 401);
    await check('La cuenta de Google pide una contraseña por correo', api('post', '/auth/recuperar', { correo: correoGoogle }), 200);
    await esperar(300);
    await check('Crea su contraseña con el enlace', api('post', '/auth/restablecer', { token: ultimoToken(correoGoogle), password: clave }), 200);
    await check('Ahora entra también con contraseña', api('post', '/auth/login', { correo: correoGoogle, password: clave }), 200);
    ok('Sigue vinculada a Google', Boolean((await prisma.usuario.findUnique({ where: { correo: correoGoogle } })).googleId));

    // Cuenta desactivada: no entra con contraseña.
    await prisma.usuario.update({ where: { correo: correoPrueba }, data: { activo: false } });
    await check('Una cuenta desactivada no entra', api('post', '/auth/login', { correo: correoPrueba, password: nueva }), 403);

    // Acceso con Google: configurado y rechazando credenciales falsas o mal formadas.
    ok('El acceso con Google está configurado (GOOGLE_CLIENT_ID)', google.configurado());
    await check('Google rechaza una credencial falsa', api('post', '/auth/google', { credencial: 'x'.repeat(40) }), 401);
    await check('Google rechaza una credencial mal formada', api('post', '/auth/google', { credencial: 123 }), 400);

    console.log(JSON.stringify({ mysqlReal: true, correoSimulado: true, total: comprobaciones.length, comprobaciones, limpieza: 'Solo las cuentas temporales qa-acceso-*@example.test y sus enlaces' }, null, 1));
  } finally {
    await prisma.usuario.deleteMany({ where: { correo: { in: [correoPrueba, correoGoogle] } } });
    await prisma.$disconnect();
  }
})().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});

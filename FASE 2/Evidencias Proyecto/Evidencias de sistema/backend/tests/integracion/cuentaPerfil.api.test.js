jest.mock('../../src/models/prisma', () => ({ usuario: { findUnique: jest.fn(), update: jest.fn() }, tokenRecuperacion: { deleteMany: jest.fn() }, $queryRaw: jest.fn(), $transaction: jest.fn() }));
jest.mock('../../src/services/google.service');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const app = require('../../src/app');
const prisma = require('../../src/models/prisma');
const google = require('../../src/services/google.service');
const token = jwt.sign({ rol: 'usuario', versionSesion: 0 }, process.env.JWT_SECRET, { subject: '7', expiresIn: '1h' });
const api = (metodo) => request(app)[metodo]('/api/perfil/cuenta').set('Authorization', `Bearer ${token}`);
let usuario;
beforeEach(() => {
  jest.resetAllMocks();
  usuario = { id: 7, nombre: 'Ana Pérez', correo: 'ana@example.test', rol: { nombre: 'usuario' }, rolConfirmado: true,
    fechaRegistro: new Date('2026-09-01'), versionSesion: 0, passwordHash: bcrypt.hashSync('Mi clave con espacios ', 4), googleId: null, datosCuenta: null };
  prisma.usuario.findUnique.mockImplementation(async () => usuario);
  prisma.$queryRaw.mockResolvedValue([{ versionSesion: 0 }]);
  prisma.$transaction.mockImplementation(async (f) => f(prisma));
  prisma.usuario.update.mockImplementation(async ({ data }) => ({ ...usuario, ...data,
    versionSesion: data.versionSesion ? 1 : usuario.versionSesion,
    datosCuenta: data.datosCuenta?.upsert.create ?? usuario.datosCuenta }));
});
test('solo la propia cuenta autenticada, sin exponer contraseñas ni Google ID', async () => {
  expect((await request(app).get('/api/perfil/cuenta')).status).toBe(401);
  const r = await api('get');
  expect(r.status).toBe(200); expect(r.body.usuario.nombre).toBe('Ana Pérez');
  expect(prisma.usuario.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 7 } }));
  expect(JSON.stringify(r.body)).not.toContain('passwordHash');
  expect(JSON.stringify(r.body)).not.toContain('googleId');
});
test('las preferencias de avisos se guardan por cuenta de usuario y aceptan booleanos', async () => {
  const preferencias = { recordatoriosCitas: true, avisosMensajesCorreo: false };
  const ruta = '/api/perfil/configuracion';
  prisma.usuario.findUnique.mockResolvedValue(preferencias);
  prisma.usuario.update.mockResolvedValue({ ...preferencias, avisosMensajesCorreo: true });
  expect((await request(app).get(ruta)).status).toBe(401);
  const profesional = jwt.sign({ rol: 'profesional', versionSesion: 0 }, process.env.JWT_SECRET, { subject: '9', expiresIn: '1h' });
  expect((await request(app).get(ruta).set('Authorization', `Bearer ${profesional}`)).status).toBe(403);
  const get = await request(app).get(ruta).set('Authorization', `Bearer ${token}`);
  expect(get.body).toEqual({ configuracion: preferencias });
  const guardar = (datos) => request(app).put(ruta).set('Authorization', `Bearer ${token}`).send(datos);
  expect((await guardar({ avisosMensajesCorreo: 'false' })).status).toBe(400);
  expect((await guardar({ avisosMensajesCorreo: true, usuarioId: 9 })).body.configuracion.avisosMensajesCorreo).toBe(true);
  expect(prisma.usuario.update).toHaveBeenCalledTimes(1);
  expect(prisma.usuario.update).toHaveBeenCalledWith({ where: { id: 7 }, data: { avisosMensajesCorreo: true }, select: { recordatoriosCitas: true, avisosMensajesCorreo: true } });
});
test('guarda solo nombre, contacto y redes sin alterar rol ni salud', async () => {
  const r = await api('put').send({ nombre: 'Ana Actualizada', telefono: '+56 9 1234 5678', biografia: 'Me gusta caminar', instagram: 'https://instagram.com/ana', sitioWeb: '' });
  expect(r.status).toBe(200);
  expect(prisma.usuario.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 7 }, data: {
    nombre: 'Ana Actualizada', datosCuenta: { upsert: {
      create: { telefono: '+56 9 1234 5678', biografia: 'Me gusta caminar', instagram: 'https://instagram.com/ana', sitioWeb: null },
      update: { telefono: '+56 9 1234 5678', biografia: 'Me gusta caminar', instagram: 'https://instagram.com/ana', sitioWeb: null },
    } },
  } }));
});
test.each([{ rol: 'administrador' }, { usuarioId: 9 }, { nombre: '' }, { correo: 'mal' }, { sitioWeb: 'javascript:alert(1)' }, { instagram: 'https://otro.cl/ana' }, { telefono: 'abc' }, { biografia: 'x'.repeat(501) }])('rechaza datos no válidos: %j', async (datos) => {
  expect((await api('put').send(datos)).status).toBe(400); expect(prisma.usuario.update).not.toHaveBeenCalled();
});
test('cambiar correo exige la contraseña actual exacta y conserva el vencimiento', async () => {
  expect((await api('put').send({ correo: 'nuevo@example.test' })).status).toBe(400);
  expect((await api('put').send({ correo: 'nuevo@example.test', password: 'incorrecta' })).status).toBe(400);
  const r = await api('put').send({ correo: 'nuevo@example.test', password: 'Mi clave con espacios ' });
  expect(r.status).toBe(200); expect(r.body.usuario.correo).toBe('nuevo@example.test');
  const firmado = jwt.verify(r.body.token, process.env.JWT_SECRET);
  expect(firmado.exp).toBe(jwt.decode(token).exp); expect(firmado.versionSesion).toBe(1);
  expect(prisma.tokenRecuperacion.deleteMany).toHaveBeenCalledWith({ where: { usuarioId: 7 } });
});
test('Google debe confirmar la misma identidad vinculada, no otra cuenta', async () => {
  usuario.passwordHash = null; usuario.googleId = 'google-ana';
  google.verificarCredencial.mockResolvedValueOnce({ googleId: 'otra-cuenta' }).mockResolvedValueOnce({ googleId: 'google-ana' });
  expect((await api('put').send({ correo: 'nuevo@example.test', credencial: 'token-otra' })).status).toBe(400);
  expect((await api('put').send({ correo: 'nuevo@example.test', credencial: 'token-ana' })).status).toBe(200);
});
test('un correo ocupado devuelve 409 y no simula éxito', async () => {
  prisma.usuario.update.mockRejectedValue({ code: 'P2002' });
  const r = await api('put').send({ correo: 'ocupado@example.test', password: 'Mi clave con espacios ' });
  expect(r.status).toBe(409); expect(r.body.detalles.correo).toMatch(/existe/);
});
test('rechaza fotos SVG, datos falsos y fotos demasiado grandes; permite quitarla', async () => {
  for (const foto of ['data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=', 'data:image/png;base64,YWJjZA==', 'x'.repeat(67000)]) {
    expect((await api('put').send({ foto })).status).toBe(400);
  }
  expect((await api('put').send({ foto: null })).status).toBe(200);
  expect(prisma.usuario.update).toHaveBeenCalledWith(expect.objectContaining({ data: {
    datosCuenta: { upsert: { create: { foto: null }, update: { foto: null } } },
  } }));
});
test('si otra sesión cambió la cuenta, no sobrescribe el correo desde datos obsoletos', async () => {
  prisma.$queryRaw.mockResolvedValue([{ versionSesion: 1 }]);
  expect((await api('put').send({ nombre: 'Otro nombre' })).status).toBe(409);
  expect(prisma.usuario.update).not.toHaveBeenCalled();
});

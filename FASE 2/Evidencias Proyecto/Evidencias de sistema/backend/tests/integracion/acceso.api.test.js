// Pruebas de integración de FS-HU-15 (recuperar contraseña) y FS-HU-17 (registro con rol y "Recordarme").
// El acceso a datos y el envío de correos se simulan.
jest.mock('../../src/models/usuario.model');
jest.mock('../../src/models/tokenRecuperacion.model');
jest.mock('../../src/services/correo.service');

const crypto = require('node:crypto');
const jwt = require('jsonwebtoken');
const request = require('supertest');
const app = require('../../src/app');
const usuarioModel = require('../../src/models/usuario.model');
const tokenModel = require('../../src/models/tokenRecuperacion.model');
const correoService = require('../../src/services/correo.service');
const { MENSAJE_SOLICITUD, MENSAJE_ENLACE_INVALIDO } = require('../../src/services/recuperacion.service');
const { PASSWORD, usuarioDePrueba } = require('../ayudantes');

const TOKEN = 'a'.repeat(64);
const HASH_TOKEN = crypto.createHash('sha256').update(TOKEN).digest('hex');
const enUnaHora = () => new Date(Date.now() + 60 * 60 * 1000);

describe('FS-HU-17: registro y "Recordarme"', () => {
  beforeEach(() => jest.resetAllMocks());

  // Desde el 24-09-2026 el tipo de cuenta se elige en el asistente de perfil (FS-HU-02), no al registrarse.
  test('escenario 1: toda cuenta nueva se crea como usuario, sin poder elegir el rol', async () => {
    usuarioModel.buscarPorCorreo.mockResolvedValue(null);
    usuarioModel.crearConPerfil.mockImplementation(async (datos) => usuarioDePrueba({ rol: { id: 1, nombre: datos.rolNombre } }));

    // Aunque la petición traiga un rol, el registro lo ignora.
    const respuesta = await request(app).post('/api/auth/registro')
      .send({ nombre: 'Ana Pérez', correo: 'ana@correo.cl', password: PASSWORD, rol: 'profesional' });

    expect(respuesta.status).toBe(201);
    expect(respuesta.body.usuario.rol).toBe('usuario');
    expect(usuarioModel.crearConPerfil.mock.calls[0][0].rolNombre).toBe('usuario');
  });

  test('tampoco se puede registrar como administrador', async () => {
    usuarioModel.buscarPorCorreo.mockResolvedValue(null);
    usuarioModel.crearConPerfil.mockImplementation(async (datos) => usuarioDePrueba({ rol: { id: 1, nombre: datos.rolNombre } }));

    await request(app).post('/api/auth/registro')
      .send({ nombre: 'Ana Pérez', correo: 'ana@correo.cl', password: PASSWORD, rol: 'administrador' });

    expect(usuarioModel.crearConPerfil.mock.calls[0][0].rolNombre).toBe('usuario');
  });

  test('escenario 3: con "Recordarme" el token dura 30 días; sin marcarlo, lo configurado por defecto', async () => {
    usuarioModel.buscarPorCorreo.mockResolvedValue(usuarioDePrueba());
    const duracion = async (cuerpo) => {
      const { body } = await request(app).post('/api/auth/login').send(cuerpo);
      const { iat, exp } = jwt.decode(body.token);
      return exp - iat;
    };

    expect(await duracion({ correo: 'ana@correo.cl', password: PASSWORD, recordar: true })).toBe(30 * 24 * 60 * 60);
    expect(await duracion({ correo: 'ana@correo.cl', password: PASSWORD })).toBe(60 * 60);
  });

  test('una cuenta sin contraseña (creada con Google) no puede entrar con contraseña', async () => {
    usuarioModel.buscarPorCorreo.mockResolvedValue(usuarioDePrueba({ passwordHash: null }));

    const respuesta = await request(app).post('/api/auth/login').send({ correo: 'ana@correo.cl', password: PASSWORD });

    expect(respuesta.status).toBe(401);
  });
});

describe('FS-HU-15: recuperar contraseña', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    correoService.enviarRecuperacion.mockResolvedValue();
  });

  describe('POST /api/auth/recuperar', () => {
    test('escenario 1: con un correo registrado guarda solo el hash del código y envía el enlace', async () => {
      usuarioModel.buscarPorCorreo.mockResolvedValue(usuarioDePrueba());

      const respuesta = await request(app).post('/api/auth/recuperar').send({ correo: 'ANA@correo.cl' });

      expect(respuesta.status).toBe(200);
      expect(respuesta.body.mensaje).toBe(MENSAJE_SOLICITUD);
      const { tokenHash, usuarioId, fechaExpiracion } = tokenModel.reemplazarPorUsuario.mock.calls[0][0];
      const { enlace, para } = correoService.enviarRecuperacion.mock.calls[0][0];
      const token = new URL(enlace).searchParams.get('token');
      expect(para).toBe('ana@correo.cl');
      expect(usuarioId).toBe(1);
      expect(token).toMatch(/^[a-f0-9]{64}$/);
      expect(tokenHash).toBe(crypto.createHash('sha256').update(token).digest('hex'));
      expect(tokenHash).not.toBe(token);
      expect(fechaExpiracion.getTime() - Date.now()).toBeGreaterThan(59 * 60 * 1000);
    });

    test('QS6: con un correo no registrado responde exactamente lo mismo y no envía nada', async () => {
      usuarioModel.buscarPorCorreo.mockResolvedValue(null);

      const respuesta = await request(app).post('/api/auth/recuperar').send({ correo: 'nadie@correo.cl' });

      expect(respuesta.status).toBe(200);
      expect(respuesta.body).toEqual({ mensaje: MENSAJE_SOLICITUD });
      expect(tokenModel.reemplazarPorUsuario).not.toHaveBeenCalled();
      expect(correoService.enviarRecuperacion).not.toHaveBeenCalled();
    });

    test('rechaza un correo con formato inválido', async () => {
      const respuesta = await request(app).post('/api/auth/recuperar').send({ correo: 'no-es-correo' });
      expect(respuesta.status).toBe(400);
    });
  });

  describe('POST /api/auth/restablecer', () => {
    test('escenario 2: con un enlace vigente cambia la contraseña y usa el código', async () => {
      tokenModel.buscarPorHash.mockResolvedValue({ id: 7, usuarioId: 1, fechaUso: null, fechaExpiracion: enUnaHora() });
      tokenModel.usarYCambiarPassword.mockResolvedValue(true);

      const respuesta = await request(app).post('/api/auth/restablecer').send({ token: TOKEN, password: 'NuevaClave456' });

      expect(respuesta.status).toBe(200);
      expect(tokenModel.buscarPorHash).toHaveBeenCalledWith(HASH_TOKEN);
      const { id, usuarioId, passwordHash } = tokenModel.usarYCambiarPassword.mock.calls[0][0];
      expect({ id, usuarioId }).toEqual({ id: 7, usuarioId: 1 });
      expect(passwordHash).toMatch(/^\$2[aby]\$/);
    });

    test.each([
      ['vencido', { id: 7, usuarioId: 1, fechaUso: null, fechaExpiracion: new Date(Date.now() - 1000) }],
      ['ya usado', { id: 7, usuarioId: 1, fechaUso: new Date(), fechaExpiracion: enUnaHora() }],
      ['inexistente o alterado', null],
    ])('escenario 3: un enlace %s responde 400 y no cambia la contraseña', async (_, registro) => {
      tokenModel.buscarPorHash.mockResolvedValue(registro);

      const respuesta = await request(app).post('/api/auth/restablecer').send({ token: TOKEN, password: 'NuevaClave456' });

      expect(respuesta.status).toBe(400);
      expect(respuesta.body.error).toBe(MENSAJE_ENLACE_INVALIDO);
      expect(tokenModel.usarYCambiarPassword).not.toHaveBeenCalled();
    });

    test('si otra petición usó el código al mismo tiempo, responde 400', async () => {
      tokenModel.buscarPorHash.mockResolvedValue({ id: 7, usuarioId: 1, fechaUso: null, fechaExpiracion: enUnaHora() });
      tokenModel.usarYCambiarPassword.mockResolvedValue(false);

      const respuesta = await request(app).post('/api/auth/restablecer').send({ token: TOKEN, password: 'NuevaClave456' });

      expect(respuesta.status).toBe(400);
    });

    test('valida el formato del código y el largo de la contraseña', async () => {
      const respuesta = await request(app).post('/api/auth/restablecer').send({ token: 'abc', password: '123' });

      expect(respuesta.status).toBe(400);
      expect(Object.keys(respuesta.body.detalles).sort()).toEqual(['password', 'token']);
      expect(tokenModel.buscarPorHash).not.toHaveBeenCalled();
    });
  });
});

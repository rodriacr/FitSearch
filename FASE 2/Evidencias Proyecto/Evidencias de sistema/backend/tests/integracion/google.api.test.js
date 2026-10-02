// Pruebas de integración de FS-HU-16 (continuar con Google). El acceso a datos y la verificación
// del token ante Google se simulan: la validación real del token se prueba en tests/unit/google.service.test.js.
jest.mock('../../src/models/usuario.model');
jest.mock('../../src/services/google.service');

const jwt = require('jsonwebtoken');
const request = require('supertest');
const app = require('../../src/app');
const usuarioModel = require('../../src/models/usuario.model');
const googleService = require('../../src/services/google.service');
const ErrorHttp = require('../../src/utils/ErrorHttp');
const { MENSAJE_OTRA_CUENTA_GOOGLE } = require('../../src/services/auth.service');
const { usuarioDePrueba } = require('../ayudantes');

const CREDENCIAL = 'token-de-identidad-de-google-de-prueba';
const CUENTA_GOOGLE = { googleId: '113355779911', correo: 'ana@correo.cl', nombre: 'Ana Pérez' };

// Cuenta creada con Google: no tiene contraseña.
const usuarioDeGoogle = (sobrescribir = {}) =>
  usuarioDePrueba({ passwordHash: null, googleId: CUENTA_GOOGLE.googleId, ...sobrescribir });

const entrarConGoogle = (cuerpo = { credencial: CREDENCIAL }) =>
  request(app).post('/api/auth/google').send(cuerpo);

describe('FS-HU-16: continuar con Google', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    googleService.verificarCredencial.mockResolvedValue(CUENTA_GOOGLE);
  });

  test('escenario 1: si el correo no tiene cuenta, la crea con rol usuario y sin contraseña', async () => {
    usuarioModel.buscarPorGoogleId.mockResolvedValue(null);
    usuarioModel.buscarPorCorreo.mockResolvedValue(null);
    usuarioModel.crearConPerfil.mockResolvedValue(usuarioDeGoogle());

    const respuesta = await entrarConGoogle();

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.cuentaNueva).toBe(true);
    expect(respuesta.body.usuario).toEqual({ id: 1, nombre: 'Ana Pérez', correo: 'ana@correo.cl', rol: 'usuario' });
    expect(usuarioModel.crearConPerfil).toHaveBeenCalledWith({
      nombre: 'Ana Pérez', correo: 'ana@correo.cl', googleId: CUENTA_GOOGLE.googleId, rolNombre: 'usuario' });
    expect(jwt.verify(respuesta.body.token, process.env.JWT_SECRET).sub).toBe('1');
  });

  test('escenario 2: si el correo ya tiene cuenta con contraseña, la vincula en vez de crear otra', async () => {
    usuarioModel.buscarPorGoogleId.mockResolvedValue(null);
    usuarioModel.buscarPorCorreo.mockResolvedValue(usuarioDePrueba());
    usuarioModel.vincularGoogle.mockResolvedValue(usuarioDeGoogle({ passwordHash: 'hash-existente' }));

    const respuesta = await entrarConGoogle();

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.cuentaNueva).toBe(false);
    expect(usuarioModel.vincularGoogle).toHaveBeenCalledWith(1, CUENTA_GOOGLE.googleId);
    expect(usuarioModel.crearConPerfil).not.toHaveBeenCalled();
  });

  test('escenario 3: una cuenta ya vinculada inicia sesión sin volver a vincularse', async () => {
    usuarioModel.buscarPorGoogleId.mockResolvedValue(usuarioDeGoogle());

    const respuesta = await entrarConGoogle();

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.cuentaNueva).toBe(false);
    expect(usuarioModel.vincularGoogle).not.toHaveBeenCalled();
    expect(usuarioModel.crearConPerfil).not.toHaveBeenCalled();
  });

  // El rol ya no se decide al entrar con Google: era fácil equivocarse (cambio de flujo del 24-09-2026).
  test('entrar con Google nunca define el tipo de cuenta, aunque la petición traiga un rol', async () => {
    usuarioModel.buscarPorGoogleId.mockResolvedValue(null);
    usuarioModel.buscarPorCorreo.mockResolvedValue(null);
    usuarioModel.crearConPerfil.mockResolvedValue(usuarioDeGoogle());

    const respuesta = await entrarConGoogle({ credencial: CREDENCIAL, rol: 'profesional' });

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.usuario.rol).toBe('usuario');
    expect(usuarioModel.crearConPerfil.mock.calls[0][0].rolNombre).toBe('usuario');
  });

  test('con "Recordarme" la sesión dura 30 días', async () => {
    usuarioModel.buscarPorGoogleId.mockResolvedValue(usuarioDeGoogle());

    const { body } = await entrarConGoogle({ credencial: CREDENCIAL, recordar: true });
    const { iat, exp } = jwt.decode(body.token);

    expect(exp - iat).toBe(30 * 24 * 60 * 60);
  });

  test('si el correo está tomado por otra cuenta de Google, no deja entrar', async () => {
    usuarioModel.buscarPorGoogleId.mockResolvedValue(null);
    usuarioModel.buscarPorCorreo.mockResolvedValue(usuarioDePrueba({ googleId: 'otra-cuenta-de-google' }));

    const respuesta = await entrarConGoogle();

    expect(respuesta.status).toBe(409);
    expect(respuesta.body.error).toBe(MENSAJE_OTRA_CUENTA_GOOGLE);
    expect(usuarioModel.vincularGoogle).not.toHaveBeenCalled();
  });

  test('si Google no valida el token, responde 401 y no toca la base de datos', async () => {
    const mensaje = 'No fue posible validar tu cuenta de Google. Intenta nuevamente';
    googleService.verificarCredencial.mockRejectedValue(new ErrorHttp(401, mensaje));

    const respuesta = await entrarConGoogle();

    expect(respuesta.status).toBe(401);
    expect(respuesta.body.error).toBe(mensaje);
    expect(usuarioModel.buscarPorGoogleId).not.toHaveBeenCalled();
  });

  test('sin credencial responde 400 y no consulta a Google', async () => {
    const respuesta = await entrarConGoogle({});

    expect(respuesta.status).toBe(400);
    expect(googleService.verificarCredencial).not.toHaveBeenCalled();
  });
});

// Pruebas de integración de la API de autenticación (rutas, validaciones, middlewares y servicios).
// El acceso a datos se simula; las pruebas contra MySQL real se agregan cuando el ambiente de prueba tenga base de datos.
jest.mock('../../src/models/usuario.model');

const request = require('supertest');
const app = require('../../src/app');
const usuarioModel = require('../../src/models/usuario.model');
const { PASSWORD, usuarioDePrueba } = require('../ayudantes');

describe('API /api/auth', () => {
  beforeEach(() => jest.resetAllMocks());

  describe('POST /api/auth/registro', () => {
    test('FS-HU-01 escenario 1: registro exitoso responde 201 con sesión iniciada', async () => {
      usuarioModel.buscarPorCorreo.mockResolvedValue(null);
      usuarioModel.crearConPerfil.mockImplementation(async (datos) => usuarioDePrueba({ correo: datos.correo }));

      const respuesta = await request(app)
        .post('/api/auth/registro')
        .send({ nombre: 'Ana Pérez', correo: '  ANA@Correo.cl ', password: PASSWORD });

      expect(respuesta.status).toBe(201);
      expect(respuesta.body.token).toEqual(expect.any(String));
      expect(respuesta.body.usuario).toEqual({ id: 1, nombre: 'Ana Pérez', correo: 'ana@correo.cl', rol: 'usuario', rolConfirmado: false });
      expect(usuarioModel.crearConPerfil.mock.calls[0][0].correo).toBe('ana@correo.cl');
    });

    test('rechaza datos incompletos indicando cada campo', async () => {
      const respuesta = await request(app).post('/api/auth/registro').send({ correo: 'no-es-correo', password: '123' });

      expect(respuesta.status).toBe(400);
      expect(Object.keys(respuesta.body.detalles).sort()).toEqual(['correo', 'nombre', 'password']);
      expect(usuarioModel.crearConPerfil).not.toHaveBeenCalled();
    });

    test('responde 409 si el correo ya está registrado', async () => {
      usuarioModel.buscarPorCorreo.mockResolvedValue(usuarioDePrueba());

      const respuesta = await request(app)
        .post('/api/auth/registro')
        .send({ nombre: 'Ana Pérez', correo: 'ana@correo.cl', password: PASSWORD });

      expect(respuesta.status).toBe(409);
    });

    test('responde 400 ante un JSON mal formado', async () => {
      const respuesta = await request(app)
        .post('/api/auth/registro')
        .set('Content-Type', 'application/json')
        .send('{"nombre": ');

      expect(respuesta.status).toBe(400);
    });
  });

  describe('POST /api/auth/login', () => {
    test('con credenciales correctas responde 200 con token', async () => {
      usuarioModel.buscarPorCorreo.mockResolvedValue(usuarioDePrueba());

      const respuesta = await request(app).post('/api/auth/login').send({ correo: 'ana@correo.cl', password: PASSWORD });

      expect(respuesta.status).toBe(200);
      expect(respuesta.body.token).toEqual(expect.any(String));
    });

    test('FS-HU-01 escenario 2: credenciales incorrectas responden 401 sin indicar cuál dato falló', async () => {
      usuarioModel.buscarPorCorreo.mockResolvedValueOnce(usuarioDePrueba()).mockResolvedValueOnce(null);

      const claveMala = await request(app).post('/api/auth/login').send({ correo: 'ana@correo.cl', password: 'incorrecta1' });
      const correoMalo = await request(app).post('/api/auth/login').send({ correo: 'otro@correo.cl', password: PASSWORD });

      expect(claveMala.status).toBe(401);
      expect(correoMalo.status).toBe(401);
      expect(claveMala.body).toEqual({ error: 'Correo o contraseña incorrectos' });
      expect(correoMalo.body).toEqual(claveMala.body);
    });
  });

  describe('POST /api/auth/logout', () => {
    test('sin token responde 401', async () => {
      const respuesta = await request(app).post('/api/auth/logout');
      expect(respuesta.status).toBe(401);
    });

    test('con token válido responde 204', async () => {
      usuarioModel.buscarPorCorreo.mockResolvedValue(usuarioDePrueba());
      const login = await request(app).post('/api/auth/login').send({ correo: 'ana@correo.cl', password: PASSWORD });

      const respuesta = await request(app).post('/api/auth/logout').set('Authorization', `Bearer ${login.body.token}`);

      expect(respuesta.status).toBe(204);
    });
  });

  test('una ruta inexistente responde 404 en JSON', async () => {
    const respuesta = await request(app).get('/api/no-existe');
    expect(respuesta.status).toBe(404);
    expect(respuesta.body.error).toBeDefined();
  });
});

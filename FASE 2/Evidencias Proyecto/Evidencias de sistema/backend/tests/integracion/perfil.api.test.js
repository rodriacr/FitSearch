// Pruebas de integración de la API de perfil (FS-HU-02). El acceso a datos se simula.
jest.mock('../../src/models/usuario.model');
jest.mock('../../src/models/perfil.model');

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../src/app');
const usuarioModel = require('../../src/models/usuario.model');
const perfilModel = require('../../src/models/perfil.model');
const { usuarioDePrueba } = require('../ayudantes');

const token = jwt.sign({ rol: 'usuario' }, process.env.JWT_SECRET, { subject: '1', expiresIn: '1h' });
const conSesion = (peticion) => peticion.set('Authorization', `Bearer ${token}`);
const datosValidos = { pesoKg: 70, alturaCm: 175, edad: 30, sexo: 'masculino', actividadFisica: 'moderada' };

describe('API /api/perfil', () => {
  beforeEach(() => jest.resetAllMocks());

  test('sin token responde 401', async () => {
    const respuesta = await request(app).get('/api/perfil');
    expect(respuesta.status).toBe(401);
  });

  test('con token expirado responde 401', async () => {
    const expirado = jwt.sign({ rol: 'usuario' }, process.env.JWT_SECRET, { subject: '1', expiresIn: -10 });
    const respuesta = await request(app).get('/api/perfil').set('Authorization', `Bearer ${expirado}`);
    expect(respuesta.status).toBe(401);
  });

  test('GET devuelve el perfil incompleto de un usuario recién registrado', async () => {
    usuarioModel.buscarPorIdConPerfil.mockResolvedValue(usuarioDePrueba());

    const respuesta = await conSesion(request(app).get('/api/perfil'));

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.completo).toBe(false);
    expect(respuesta.body.requerimientoCaloricoKcal).toBeNull();
    expect(respuesta.body.usuario).toEqual({ id: 1, nombre: 'Ana Pérez', correo: 'ana@correo.cl', rol: 'usuario', rolConfirmado: false });
    expect(usuarioModel.buscarPorIdConPerfil).toHaveBeenCalledWith(1);
  });

  test('FS-HU-02 escenario 1: guarda los datos básicos y los usa para estimar el requerimiento calórico', async () => {
    usuarioModel.buscarPorIdConPerfil.mockResolvedValue(usuarioDePrueba({ perfil: { ...datosValidos } }));

    const respuesta = await conSesion(request(app).put('/api/perfil')).send(datosValidos);

    expect(respuesta.status).toBe(200);
    expect(perfilModel.guardar).toHaveBeenCalledWith(1, datosValidos);
    expect(respuesta.body.completo).toBe(true);
    expect(respuesta.body.perfil).toEqual(datosValidos);
    expect(respuesta.body.requerimientoCaloricoKcal).toBe(2556);
  });

  test('FS-HU-02 escenario 2: con campos vacíos no guarda y señala qué campos faltan', async () => {
    const respuesta = await conSesion(request(app).put('/api/perfil')).send({ pesoKg: 70, alturaCm: '', sexo: '', actividadFisica: '' });

    expect(respuesta.status).toBe(400);
    expect(Object.keys(respuesta.body.detalles).sort()).toEqual(['actividadFisica', 'alturaCm', 'edad', 'sexo']);
    expect(perfilModel.guardar).not.toHaveBeenCalled();
  });

  test('rechaza valores fuera de rango o no permitidos', async () => {
    const respuesta = await conSesion(request(app).put('/api/perfil'))
      .send({ pesoKg: 5, alturaCm: 400, edad: 25.5, sexo: 'otro', actividadFisica: 'extrema' });

    expect(respuesta.status).toBe(400);
    expect(Object.keys(respuesta.body.detalles).sort()).toEqual(['actividadFisica', 'alturaCm', 'edad', 'pesoKg', 'sexo']);
  });
});

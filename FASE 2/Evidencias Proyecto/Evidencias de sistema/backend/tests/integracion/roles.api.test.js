// Separación por rol (DAS, D25): el profesional no usa el asistente, el buscador ni los favoritos del usuario,
// y el usuario no usa las pantallas del profesional. El acceso a datos se simula.
jest.mock('../../src/models/usuario.model');
jest.mock('../../src/models/perfil.model');
jest.mock('../../src/models/salud.model');
jest.mock('../../src/models/profesional.model');
jest.mock('../../src/models/favorito.model');

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../src/app');
const perfilModel = require('../../src/models/perfil.model');
const saludModel = require('../../src/models/salud.model');
const profesionalModel = require('../../src/models/profesional.model');
const favoritoModel = require('../../src/models/favorito.model');

const firmar = (rol) => jwt.sign({ rol }, process.env.JWT_SECRET, { subject: '7', expiresIn: '1h' });
const como = (rol, peticion) => peticion.set('Authorization', `Bearer ${firmar(rol)}`);
beforeEach(() => jest.resetAllMocks());

describe('una cuenta profesional', () => {
  test.each([
    ['PUT', '/api/perfil', { pesoKg: 70, alturaCm: 175, edad: 30, sexo: 'masculino', actividadFisica: 'moderada' }],
    ['PUT', '/api/perfil/objetivos', { objetivoPrincipal: 'bajar_peso', comidasDia: 3, horasSueno: '7_8' }],
    ['PUT', '/api/perfil/salud', { condicionesMedicas: ['ninguna'], tomaMedicamentos: false, medicamentos: [], alergias: ['ninguna'] }],
  ])('no completa datos del asistente del usuario (%s %s)', async (metodo, ruta, cuerpo) => {
    const respuesta = await como('profesional', request(app)[metodo.toLowerCase()](ruta)).send(cuerpo);
    expect(respuesta.status).toBe(403);
    expect(perfilModel.guardar).not.toHaveBeenCalled();
    expect(saludModel.guardar).not.toHaveBeenCalled();
  });

  test.each([
    ['/api/profesionales'],
    ['/api/profesionales/filtros'],
    ['/api/favoritos'],
  ])('no usa el buscador ni los favoritos del usuario (GET %s)', async (ruta) => {
    expect((await como('profesional', request(app).get(ruta))).status).toBe(403);
    expect(profesionalModel.listar).not.toHaveBeenCalled();
  });

  test('no guarda favoritos', async () => {
    expect((await como('profesional', request(app).put('/api/favoritos/3'))).status).toBe(403);
    expect(favoritoModel.agregar).not.toHaveBeenCalled();
  });
});

describe('una cuenta de usuario', () => {
  test.each([
    ['/api/clima'],
    ['/api/profesionales/mi-ficha'],
  ])('no entra a las pantallas del profesional (GET %s)', async (ruta) => {
    expect((await como('usuario', request(app).get(ruta))).status).toBe(403);
  });
});

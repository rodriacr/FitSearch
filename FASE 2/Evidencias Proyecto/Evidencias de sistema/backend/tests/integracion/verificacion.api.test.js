jest.mock('../../src/models/profesional.model');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../src/app');
const modelo = require('../../src/models/profesional.model');

const verificar = (rol, id = 5) => {
  const peticion = request(app).patch(`/api/profesionales/${id}/verificar`);
  if (rol) peticion.set('Authorization', `Bearer ${jwt.sign({ rol }, process.env.JWT_SECRET, { subject: '7', expiresIn: '1h' })}`);
  return peticion.send({ verificado: false, usuarioId: 99 });
};

beforeEach(() => jest.resetAllMocks());

test('solo el administrador verifica una ficha profesional existente', async () => {
  modelo.existe.mockResolvedValue({ id: 5, usuarioId: 8 });
  modelo.verificarPerfil.mockResolvedValue({ id: 5, verificado: true, ubicacionLat: '-33.43', ubicacionLng: '-70.65' });
  const res = await verificar('administrador');
  expect(res.status).toBe(200);
  expect(res.body).toEqual({ id: 5, verificado: true });
  expect(modelo.verificarPerfil).toHaveBeenCalledWith(5);
});

test.each(['usuario', 'profesional'])('una cuenta de %s no puede verificar ni su propia ficha', async (rol) => {
  expect((await verificar(rol)).status).toBe(403);
  expect(modelo.verificarPerfil).not.toHaveBeenCalled();
});

test('sin sesión no permite verificar', async () => {
  expect((await verificar()).status).toBe(401);
  expect(modelo.verificarPerfil).not.toHaveBeenCalled();
});

test('rechaza un id inválido antes de consultar los datos', async () => {
  expect((await verificar('administrador', 'invalido')).status).toBe(400);
  expect(modelo.existe).not.toHaveBeenCalled();
});

test('una ficha inexistente devuelve 404', async () => {
  modelo.existe.mockResolvedValue(null);
  expect((await verificar('administrador')).status).toBe(404);
  expect(modelo.verificarPerfil).not.toHaveBeenCalled();
});

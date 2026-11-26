// Logros y medallas (25-11-2026): rutas de la API. El servicio se simula; sus reglas se prueban en logro.service.test.js.
jest.mock('../../src/services/logro.service');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../src/app');
const servicio = require('../../src/services/logro.service');

const firmar = (rol = 'usuario') => jwt.sign({ rol }, process.env.JWT_SECRET, { subject: '1', expiresIn: '1h' });
const conSesion = (peticion, rol) => peticion.set('Authorization', `Bearer ${firmar(rol)}`);
beforeEach(() => jest.resetAllMocks());

test('GET /api/logros entrega el resumen de la persona', async () => {
  servicio.resumen.mockResolvedValue({ nivel: { numero: 2 }, nuevas: [] });
  const res = await conSesion(request(app).get('/api/logros'));
  expect(res.status).toBe(200);
  expect(res.body).toEqual({ nivel: { numero: 2 }, nuevas: [] });
  expect(servicio.resumen).toHaveBeenCalledWith(1);
});

test('POST /api/logros/vistas marca las medallas nuevas como vistas', async () => {
  const res = await conSesion(request(app).post('/api/logros/vistas'));
  expect(res.status).toBe(204);
  expect(servicio.marcarVistas).toHaveBeenCalledWith(1);
});

test('es de la cuenta de usuario: pide sesión y el profesional no entra', async () => {
  expect((await request(app).get('/api/logros')).status).toBe(401);
  expect((await conSesion(request(app).get('/api/logros'), 'profesional')).status).toBe(403);
  expect((await conSesion(request(app).post('/api/logros/vistas'), 'profesional')).status).toBe(403);
  expect(servicio.resumen).not.toHaveBeenCalled();
});

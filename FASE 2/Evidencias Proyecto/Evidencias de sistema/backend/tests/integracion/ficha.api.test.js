jest.mock('../../src/models/profesional.model');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../src/app');
const modelo = require('../../src/models/profesional.model');

const tokenDe = (rol) => jwt.sign({ rol }, process.env.JWT_SECRET, { subject: '7', expiresIn: '1h' });
const enviar = (rol, cuerpo) => request(app).put('/api/profesionales/mi-ficha').set('Authorization', `Bearer ${tokenDe(rol)}`).send(cuerpo);
const valido = { especialidad: 'Nutrición', descripcion: 'Atención nutricional', ubicacionLat: -33.4372, ubicacionLng: -70.6506 };
beforeEach(() => jest.resetAllMocks());

test('un profesional guarda su ficha', async () => {
  modelo.guardarFicha.mockResolvedValue({ ...valido, ubicacionLat: '-33.4372000', ubicacionLng: '-70.6506000' });
  const res = await enviar('profesional', valido);
  expect(res.status).toBe(200);
  expect(res.body.ficha).toEqual(valido);
  expect(modelo.guardarFicha).toHaveBeenCalledWith(7, valido);
});
test('rechaza coordenadas fuera de rango y especialidad vacía', async () => {
  const res = await enviar('profesional', { ...valido, especialidad: '', ubicacionLat: 120 });
  expect(res.status).toBe(400);
  expect(res.body.detalles).toMatchObject({ especialidad: 'Selecciona tu especialidad', ubicacionLat: 'La latitud debe estar entre -90 y 90' });
  expect(modelo.guardarFicha).not.toHaveBeenCalled();
});
test('una cuenta de usuario no puede crear una ficha', async () => {
  expect((await enviar('usuario', valido)).status).toBe(403);
});
test('devuelve ficha null si el profesional aún no la completa', async () => {
  modelo.obtenerPorUsuario.mockResolvedValue(null);
  const res = await request(app).get('/api/profesionales/mi-ficha').set('Authorization', `Bearer ${tokenDe('profesional')}`);
  expect(res.status).toBe(200);
  expect(res.body).toEqual({ ficha: null });
});

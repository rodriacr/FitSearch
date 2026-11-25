// Clima de la ubicación actual; no se consulta la ficha profesional ni se inventa una ciudad.
jest.mock('../../src/models/profesional.model');
jest.mock('../../src/services/geocodificacion.service', () => ({ lugarDelPunto: jest.fn() }));
const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../src/app');
const modelo = require('../../src/models/profesional.model');
const geocodificacion = require('../../src/services/geocodificacion.service');
const { describir, reiniciarCache } = require('../../src/services/clima.service');
const token = jwt.sign({ rol: 'profesional' }, process.env.JWT_SECRET, { subject: '7', expiresIn: '1h' });
const punto = { lat: -33.593712, lng: -71.621791 };
const consultar = (cuerpo = punto) => request(app).post('/api/clima').set('Authorization', `Bearer ${token}`).send(cuerpo);
let fetchSimulado;
beforeEach(() => {
  jest.resetAllMocks(); reiniciarCache();
  geocodificacion.lugarDelPunto.mockResolvedValue('San Antonio');
  fetchSimulado = jest.spyOn(global, 'fetch').mockResolvedValue({ ok: true, json: async () => ({ current: { temperature_2m: 18.4, weather_code: 0, is_day: 1 } }) });
});
afterEach(() => fetchSimulado.mockRestore());

test('atiende en Santiago pero está en San Antonio: usa la ubicación actual, sin leer la ficha', async () => {
  modelo.obtenerPorUsuario.mockResolvedValue({ comuna: 'Santiago', ubicacionLat: -33.45, ubicacionLng: -70.67 });
  const respuesta = await consultar();
  expect(respuesta.status).toBe(200);
  expect(respuesta.body).toEqual({ lugar: 'San Antonio', temperatura: 18, estado: 'despejado', descripcion: 'Despejado', esDeDia: true, fuente: 'Open-Meteo' });
  expect(modelo.obtenerPorUsuario).not.toHaveBeenCalled();
  const url = new URL(fetchSimulado.mock.calls[0][0]);
  expect(url.searchParams.get('latitude')).toBe('-33.59');
  expect(url.searchParams.get('longitude')).toBe('-71.62');
  expect(geocodificacion.lugarDelPunto).toHaveBeenCalledWith({ lat: -33.59, lng: -71.62 });
});
test('no necesita ficha ni lugar de atención para consultar el clima', async () => {
  modelo.obtenerPorUsuario.mockResolvedValue(null);
  expect((await consultar()).body.lugar).toBe('San Antonio');
});
test('una posición distinta cambia el lugar y no reutiliza el clima de otra ciudad', async () => {
  await consultar();
  geocodificacion.lugarDelPunto.mockResolvedValue('Santiago');
  const respuesta = await consultar({ lat: -33.45, lng: -70.67 });
  expect(respuesta.body.lugar).toBe('Santiago');
  expect(fetchSimulado).toHaveBeenCalledTimes(2);
});
test('sin coordenadas no usa Santiago ni el perfil como sustitutos', async () => {
  const respuesta = await request(app).get('/api/clima').set('Authorization', `Bearer ${token}`);
  expect(respuesta.status).toBe(400);
  expect(fetchSimulado).not.toHaveBeenCalled();
});
test.each([{}, { lat: null, lng: -71 }, { lat: '', lng: -71 }, { lat: 91, lng: -71 }, { lat: -33, lng: -181 }, { lat: true, lng: 1 }, { lat: [1], lng: 1 }, { lat: 'no-es-numero', lng: 1 }])('rechaza coordenadas inválidas sin consultar proveedores: %j', async (cuerpo) => {
  expect((await consultar(cuerpo)).status).toBe(400);
  expect(fetchSimulado).not.toHaveBeenCalled();
  expect(geocodificacion.lugarDelPunto).not.toHaveBeenCalled();
});
test('consultas del mismo punto comparten el clima durante 30 minutos', async () => {
  await Promise.all([consultar(), consultar()]);
  await consultar();
  expect(fetchSimulado).toHaveBeenCalledTimes(1);
});
test('si falla la identificación de la ciudad muestra ubicación actual, sin inventar otra ciudad', async () => {
  geocodificacion.lugarDelPunto.mockRejectedValue(new Error('Sin geocodificación'));
  const respuesta = await consultar();
  expect(respuesta.status).toBe(200);
  expect(respuesta.body.lugar).toBe('Ubicación actual');
});
test('si falla el proveedor del tiempo permite tratarlo como error recuperable', async () => {
  fetchSimulado.mockResolvedValue({ ok: false, status: 503 });
  expect((await consultar()).status).toBe(503);
});
test('si el proveedor no responde también devuelve un error recuperable', async () => {
  fetchSimulado.mockRejectedValue(new Error('timeout'));
  expect((await consultar()).status).toBe(503);
});
test('conserva los estados del tiempo que sabe dibujar la interfaz', () => {
  expect(describir(2)).toMatchObject({ estado: 'parcial' });
  expect(describir(63)).toMatchObject({ estado: 'lluvia' });
  expect(describir(95)).toMatchObject({ estado: 'tormenta' });
  expect(describir(1234)).toMatchObject({ descripcion: 'Variable' });
});

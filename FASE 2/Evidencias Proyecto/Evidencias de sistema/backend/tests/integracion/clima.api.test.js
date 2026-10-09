// Clima del Inicio del profesional (DAS, D26). Open-Meteo y la base de datos se simulan.
jest.mock('../../src/models/profesional.model');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../src/app');
const modelo = require('../../src/models/profesional.model');
const { describir, reiniciarCache } = require('../../src/services/clima.service');

const token = jwt.sign({ rol: 'profesional' }, process.env.JWT_SECRET, { subject: '7', expiresIn: '1h' });
const consultar = () => request(app).get('/api/clima').set('Authorization', `Bearer ${token}`);
const respuestaOpenMeteo = (current, ok = true) => Promise.resolve({ ok, status: ok ? 200 : 500, json: async () => ({ current }) });
let fetchSimulado;

beforeEach(() => {
  jest.resetAllMocks();
  reiniciarCache();
  fetchSimulado = jest.spyOn(global, 'fetch').mockImplementation(() => respuestaOpenMeteo({ temperature_2m: 18.4, weather_code: 0, is_day: 1 }));
});
afterEach(() => fetchSimulado.mockRestore());

test('con ficha usa la comuna y la ubicación redondeada del profesional', async () => {
  modelo.obtenerPorUsuario.mockResolvedValue({ comuna: 'Ñuñoa', ubicacionLat: '-33.4569123', ubicacionLng: '-70.5976456' });
  const respuesta = await consultar();

  expect(respuesta.status).toBe(200);
  expect(respuesta.body).toEqual({ lugar: 'Ñuñoa', temperatura: 18, estado: 'despejado', descripcion: 'Despejado', esDeDia: true, fuente: 'Open-Meteo' });
  const url = new URL(fetchSimulado.mock.calls[0][0]);
  expect(url.origin).toBe('https://api.open-meteo.com');
  // A Open-Meteo solo viaja la ubicación aproximada (2 decimales).
  expect(url.searchParams.get('latitude')).toBe('-33.46');
  expect(url.searchParams.get('longitude')).toBe('-70.6');
  expect(modelo.obtenerPorUsuario).toHaveBeenCalledWith(7);
});

test('sin ficha muestra el clima de Santiago', async () => {
  modelo.obtenerPorUsuario.mockResolvedValue(null);
  const respuesta = await consultar();
  expect(respuesta.body.lugar).toBe('Santiago');
});

test('reutiliza la respuesta del mismo lugar durante 30 minutos', async () => {
  modelo.obtenerPorUsuario.mockResolvedValue(null);
  await consultar();
  await consultar();
  expect(fetchSimulado).toHaveBeenCalledTimes(1);
});

test('si Open-Meteo falla responde 503 y el Inicio puede ocultar el clima', async () => {
  modelo.obtenerPorUsuario.mockResolvedValue(null);
  fetchSimulado.mockImplementation(() => respuestaOpenMeteo(null, false));
  const respuesta = await consultar();
  expect(respuesta.status).toBe(503);
  expect(respuesta.body.error).toBe('El clima no está disponible en este momento');
});

test('si Open-Meteo no responde a tiempo también responde 503', async () => {
  modelo.obtenerPorUsuario.mockResolvedValue(null);
  fetchSimulado.mockImplementation(() => Promise.reject(new Error('timeout')));
  expect((await consultar()).status).toBe(503);
});

test('los códigos del clima se agrupan en estados que la interfaz sabe dibujar', () => {
  expect(describir(2)).toMatchObject({ estado: 'parcial', descripcion: 'Parcialmente nublado' });
  expect(describir(63)).toMatchObject({ estado: 'lluvia' });
  expect(describir(95)).toMatchObject({ estado: 'tormenta' });
  expect(describir(1234)).toMatchObject({ estado: 'nublado', descripcion: 'Variable' });
});

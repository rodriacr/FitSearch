// Ubicación de atención desde la comuna y la dirección (SC-28, DAS D36): GET /api/profesionales/mi-ficha/ubicacion.
// Nominatim (OpenStreetMap) se simula.
const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../src/app');
const { calleYNumero, reiniciar } = require('../../src/services/geocodificacion.service');

const tokenDe = (rol) => jwt.sign({ rol }, process.env.JWT_SECRET, { subject: '7', expiresIn: '1h' });
const ubicar = (consulta, rol = 'profesional') => request(app).get('/api/profesionales/mi-ficha/ubicacion')
  .query(consulta).set('Authorization', `Bearer ${tokenDe(rol)}`);
const respuesta = (lugares, ok = true) => Promise.resolve({ ok, status: ok ? 200 : 429, json: async () => lugares });

const PROVIDENCIA_1234 = {
  lat: '-33.4290115', lon: '-70.6211027', name: 'Normandie',
  address: { house_number: '1234', road: 'Avenida Providencia', suburb: 'Providencia', city: 'Providencia' },
};
const BARROS_LUCO = {
  lat: '-33.5999271', lon: '-71.6134215', name: 'Avenida Barros Luco',
  address: { road: 'Avenida Barros Luco', suburb: 'Barrancas', city: 'San Antonio' },
};
const SAN_ANTONIO = { lat: '-33.5808615', lon: '-71.6132377', name: 'San Antonio', address: { city: 'San Antonio' } };
const NUEVA_PROVIDENCIA = {
  lat: '-33.4179339', lon: '-70.6017891', name: 'Avenida Nueva Providencia',
  address: { road: 'Avenida Nueva Providencia', suburb: 'Providencia', city: 'Providencia' },
};
const LAS_CONDES = { lat: '-33.4085', lon: '-70.5675', name: 'Las Condes', address: { suburb: 'Las Condes', city: 'Santiago' } };

let fetchSimulado;
const parametros = (llamada) => new URL(fetchSimulado.mock.calls[llamada][0]).searchParams;

beforeEach(() => {
  reiniciar({ intervaloMs: 0 });
  fetchSimulado = jest.spyOn(global, 'fetch').mockImplementation(() => respuesta([]));
});
afterEach(() => fetchSimulado.mockRestore());

test('con calle y número entrega la ubicación exacta y dice qué encontró', async () => {
  fetchSimulado.mockImplementation(() => respuesta([PROVIDENCIA_1234]));
  const res = await ubicar({ comuna: 'Providencia', direccion: 'Av. Providencia 1234, oficina 501' });

  expect(res.status).toBe(200);
  expect(res.body).toEqual({ lat: -33.4290115, lng: -70.6211027, precision: 'exacta', encontrada: 'Avenida Providencia 1234, Providencia' });
  const [url, opciones] = fetchSimulado.mock.calls[0];
  expect(new URL(url).origin).toBe('https://nominatim.openstreetmap.org');
  // Solo viajan la calle y el número (sin la oficina), la comuna y el país.
  expect(Object.fromEntries(parametros(0))).toMatchObject({ street: 'Av. Providencia 1234', city: 'Providencia', countrycodes: 'cl' });
  // La política de Nominatim exige identificar la aplicación.
  expect(opciones.headers['User-Agent']).toMatch(/^FitSearch\//);
});

test('si encuentra la calle pero no el número lo dice con la precisión «calle»', async () => {
  fetchSimulado.mockImplementation(() => respuesta([BARROS_LUCO]));
  // La comuna se muestra con el nombre oficial aunque se escriba en minúsculas.
  const res = await ubicar({ comuna: 'san antonio', direccion: 'Barros Luco 1500' });
  expect(res.body).toMatchObject({ precision: 'calle', encontrada: 'Avenida Barros Luco, San Antonio' });
});

test('sin dirección (atiende solo online) ubica el centro de la comuna', async () => {
  fetchSimulado.mockImplementation(() => respuesta([SAN_ANTONIO]));
  const res = await ubicar({ comuna: 'san antonio' });

  expect(res.body).toEqual({ lat: -33.5808615, lng: -71.6132377, precision: 'comuna', encontrada: 'San Antonio' });
  expect(fetchSimulado).toHaveBeenCalledTimes(1);
  expect(parametros(0).get('street')).toBeNull();
});

test('si no encuentra la dirección ubica el centro de la comuna', async () => {
  fetchSimulado.mockReturnValueOnce(respuesta([])).mockReturnValueOnce(respuesta([SAN_ANTONIO]));
  const res = await ubicar({ comuna: 'San Antonio', direccion: 'Calle Inventada 99999' });
  expect(res.body).toMatchObject({ precision: 'comuna', encontrada: 'San Antonio' });
  expect(parametros(1).get('city')).toBe('San Antonio');
});

test('descarta una calle de otra comuna aunque Nominatim la devuelva', async () => {
  // Con «Las Condes» Nominatim devolvió la Avenida Nueva Providencia, que está en Providencia.
  fetchSimulado.mockReturnValueOnce(respuesta([NUEVA_PROVIDENCIA])).mockReturnValueOnce(respuesta([LAS_CONDES]));
  const res = await ubicar({ comuna: 'Las Condes', direccion: 'Av Providencia 1234' });
  expect(res.body).toMatchObject({ precision: 'comuna', encontrada: 'Las Condes' });
});

test('una comuna que no existe en Chile responde 404 con el error en el campo comuna', async () => {
  const res = await ubicar({ comuna: 'Comuna Falsa', direccion: 'Calle 1' });
  expect(res.status).toBe(404);
  expect(res.body.detalles).toEqual({ comuna: 'No encontramos esa comuna en Chile. Revisa cómo está escrita.' });
});

test('ignora lugares fuera de Chile', async () => {
  fetchSimulado.mockImplementation(() => respuesta([{ ...SAN_ANTONIO, lat: '29.42', lon: '-98.49' }]));
  expect((await ubicar({ comuna: 'San Antonio' })).status).toBe(404);
});

test('si Nominatim falla o no responde a tiempo responde 503', async () => {
  fetchSimulado.mockImplementation(() => respuesta([], false));
  const res = await ubicar({ comuna: 'Providencia', direccion: 'Av. Providencia 1234' });
  expect(res.status).toBe(503);
  expect(res.body.error).toBe('No pudimos buscar tu dirección en este momento. Intenta de nuevo en unos segundos.');

  fetchSimulado.mockImplementation(() => Promise.reject(new Error('timeout')));
  expect((await ubicar({ comuna: 'Providencia', direccion: 'Av. Providencia 1234' })).status).toBe(503);
});

test('recuerda la respuesta de la misma dirección (sin importar tildes ni mayúsculas)', async () => {
  fetchSimulado.mockImplementation(() => respuesta([PROVIDENCIA_1234]));
  await ubicar({ comuna: 'Providencia', direccion: 'Av. Providencia 1234' });
  await ubicar({ comuna: 'PROVIDENCIA', direccion: 'av. providencia 1234' });
  expect(fetchSimulado).toHaveBeenCalledTimes(1);
});

test('espera al menos un segundo entre consultas a Nominatim, como pide su política de uso', async () => {
  reiniciar();
  const momentos = [];
  fetchSimulado.mockImplementation(() => { momentos.push(Date.now()); return respuesta([]); });
  await Promise.all([ubicar({ comuna: 'Comuna Uno' }), ubicar({ comuna: 'Comuna Dos' })]);
  expect(momentos).toHaveLength(2);
  expect(momentos[1] - momentos[0]).toBeGreaterThanOrEqual(1000);
});

test('valida la comuna y la dirección, y solo el profesional puede usarla', async () => {
  expect((await ubicar({ direccion: 'Av. Providencia 1234' })).body.detalles).toEqual({ comuna: 'Ingresa la comuna donde atiendes' });
  expect((await ubicar({ comuna: 'x'.repeat(81) })).status).toBe(400);
  expect((await ubicar({ comuna: 'Providencia', direccion: 'x'.repeat(151) })).status).toBe(400);
  expect((await ubicar({ comuna: 'Providencia' }, 'usuario')).status).toBe(403);
  expect(fetchSimulado).not.toHaveBeenCalled();
});

test('la búsqueda usa solo la calle y el número', () => {
  expect(calleYNumero('Av. Providencia 1234, oficina 501')).toBe('Av. Providencia 1234');
  expect(calleYNumero('Av. Providencia 1234 of. 501')).toBe('Av. Providencia 1234');
  expect(calleYNumero('Irarrázaval 2401 depto 42')).toBe('Irarrázaval 2401');
  expect(calleYNumero('Los Leones 120 #12')).toBe('Los Leones 120');
  expect(calleYNumero('Pasaje Casa Blanca 45')).toBe('Pasaje Casa Blanca 45');
  expect(calleYNumero('Calle 5 Norte 123, local B2')).toBe('Calle 5 Norte 123');
});

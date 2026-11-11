// Directorio de centros de salud y gimnasios (FS-HU-25): listado con filtros, ficha y comunas. El acceso a datos se simula.
jest.mock('../../src/models/establecimiento.model');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../src/app');
const modelo = require('../../src/models/establecimiento.model');

const firmar = (rol = 'usuario', sub = '1') => jwt.sign({ rol }, process.env.JWT_SECRET, { subject: sub, expiresIn: '1h' });
const consulta = (ruta, token = firmar()) => request(app).get(ruta).set('Authorization', `Bearer ${token}`);

// Fila tal como la entrega MySQL: conteos BigInt y coordenadas como texto decimal.
const fila = {
  id: 3, nombre: 'Centro Médico Demo', categoria: 'centro_salud', comuna: 'Ñuñoa', direccion: 'Av. Irarrázaval 1000',
  ubicacionLat: '-33.4540000', ubicacionLng: '-70.5980000', distanciaKm: null, totalProfesionales: 2n,
};
const esperado = {
  id: 3, nombre: 'Centro Médico Demo', categoria: 'centro_salud', comuna: 'Ñuñoa', direccion: 'Av. Irarrázaval 1000',
  ubicacionLat: -33.454, ubicacionLng: -70.598, distanciaKm: null, totalProfesionales: 2,
};
const porDefecto = { categoria: 'centro_salud', comuna: '', ubicacion: null, distanciaKm: null, orden: 'nombre', pagina: 1, limite: 12 };
beforeEach(() => jest.resetAllMocks());

describe('GET /api/establecimientos', () => {
  test('lista los centros de salud con su dirección y cuántos profesionales tienen asociados', async () => {
    modelo.listar.mockResolvedValue({ filas: [fila], total: 1 });
    const res = await consulta('/api/establecimientos?categoria=centro_salud');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ establecimientos: [esperado], pagina: 1, total: 1, totalPaginas: 1, hayMas: false });
    expect(modelo.listar).toHaveBeenCalledWith(porDefecto);
  });

  test('filtra gimnasios por comuna, retirando espacios, y pagina', async () => {
    modelo.listar.mockResolvedValue({ filas: [], total: 13 });
    const res = await consulta('/api/establecimientos').query({ categoria: 'gimnasio', comuna: ' Providencia ', pagina: '1' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ establecimientos: [], total: 13, totalPaginas: 2, hayMas: true });
    expect(modelo.listar).toHaveBeenCalledWith({ ...porDefecto, categoria: 'gimnasio', comuna: 'Providencia' });
  });

  test('filtra por distancia con la ubicación redondeada a 3 decimales y ordena por cercanía', async () => {
    modelo.listar.mockResolvedValue({ filas: [{ ...fila, distanciaKm: '1.2649' }], total: 1 });
    const res = await consulta('/api/establecimientos').query({
      categoria: 'centro_salud', lat: '-33.456789', lng: '-70.601234', distanciaKm: '5', orden: 'cercania',
    });
    expect(res.status).toBe(200);
    expect(res.body.establecimientos[0].distanciaKm).toBe(1.3);
    expect(modelo.listar).toHaveBeenCalledWith({
      ...porDefecto, ubicacion: { lat: -33.457, lng: -70.601 }, distanciaKm: 5, orden: 'cercania',
    });
  });

  test.each([
    ['sin categoría', {}, 'Indica si buscas centros de salud o gimnasios'],
    ['una categoría que no existe', { categoria: 'farmacia' }, 'Indica si buscas centros de salud o gimnasios'],
    ['la categoría repetida', { categoria: ['gimnasio', 'centro_salud'] }, 'Indica si buscas centros de salud o gimnasios'],
    ['una distancia fuera de las opciones', { categoria: 'gimnasio', lat: '-33.4', lng: '-70.6', distanciaKm: '7' }, 'La distancia debe ser una de: 2, 5, 10, 25 km'],
    ['la distancia sin ubicación', { categoria: 'gimnasio', distanciaKm: '5' }, 'Para filtrar por distancia se necesita tu ubicación'],
    ['la cercanía sin ubicación', { categoria: 'gimnasio', orden: 'cercania' }, 'Para ordenar por cercanía se necesita tu ubicación'],
    ['la latitud sin longitud', { categoria: 'gimnasio', lat: '-33.4' }, 'Envía la latitud y la longitud juntas'],
    ['un orden que no existe', { categoria: 'gimnasio', orden: 'calificacion' }, 'Selecciona un orden válido'],
  ])('rechaza %s con un 400 y no consulta la base de datos', async (_caso, parametros, mensaje) => {
    const res = await consulta('/api/establecimientos').query(parametros);
    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body)).toContain(mensaje);
    expect(modelo.listar).not.toHaveBeenCalled();
  });

  test('es del usuario: pide sesión y no lo abren el profesional ni el administrador', async () => {
    expect((await request(app).get('/api/establecimientos?categoria=gimnasio')).status).toBe(401);
    expect((await consulta('/api/establecimientos?categoria=gimnasio', firmar('profesional'))).status).toBe(403);
    expect((await consulta('/api/establecimientos?categoria=gimnasio', firmar('administrador'))).status).toBe(403);
    expect(modelo.listar).not.toHaveBeenCalled();
  });
});

describe('GET /api/establecimientos/:id', () => {
  test('muestra la ficha con su ubicación y los profesionales asociados, sin datos de sus cuentas', async () => {
    modelo.buscarPorId.mockResolvedValue({
      id: 3, nombre: 'Centro Médico Demo', categoria: 'centro_salud', comuna: 'Ñuñoa', direccion: 'Av. Irarrázaval 1000',
      ubicacionLat: '-33.4540000', ubicacionLng: '-70.5980000',
      profesionales: [{ id: 8, especialidad: 'Kinesiología', modalidad: 'presencial', verificado: true, usuario: { nombre: 'Ana Demo' } }],
    });
    const res = await consulta('/api/establecimientos/3');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      establecimiento: {
        ...esperado, totalProfesionales: 1,
        profesionales: [{ id: 8, nombre: 'Ana Demo', especialidad: 'Kinesiología', modalidad: 'presencial', verificado: true }],
      },
    });
    expect(modelo.buscarPorId).toHaveBeenCalledWith(3);
  });

  test('un establecimiento inexistente o desactivado responde 404', async () => {
    modelo.buscarPorId.mockResolvedValue(null);
    const res = await consulta('/api/establecimientos/99');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('No encontramos ese establecimiento');
  });

  test('un id que no es un número responde 400', async () => {
    expect((await consulta('/api/establecimientos/abc')).status).toBe(400);
    expect(modelo.buscarPorId).not.toHaveBeenCalled();
  });
});

describe('GET /api/establecimientos/filtros', () => {
  test('entrega las comunas con establecimientos activos de la categoría', async () => {
    modelo.comunas.mockResolvedValue(['Ñuñoa', 'Providencia']);
    const res = await consulta('/api/establecimientos/filtros?categoria=gimnasio');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ comunas: ['Ñuñoa', 'Providencia'] });
    expect(modelo.comunas).toHaveBeenCalledWith('gimnasio');
  });

  test('sin categoría responde 400', async () => {
    expect((await consulta('/api/establecimientos/filtros')).status).toBe(400);
  });
});

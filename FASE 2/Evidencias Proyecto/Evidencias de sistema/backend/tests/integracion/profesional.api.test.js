// Directorio de profesionales: listado con búsqueda y filtros (FS-HU-03, FS-HU-05, FS-HU-22) y ficha. El acceso a datos se simula.
jest.mock('../../src/models/profesional.model');
jest.mock('../../src/models/resena.model');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../src/app');
const modelo = require('../../src/models/profesional.model');
const resenaModel = require('../../src/models/resena.model');

const firmar = (rol = 'usuario', sub = '1') => jwt.sign({ rol }, process.env.JWT_SECRET, { subject: sub, expiresIn: '1h' });
const consulta = (ruta, token = firmar()) => request(app).get(ruta).set('Authorization', `Bearer ${token}`);

// Fila tal como la entrega MySQL: conteos BigInt, promedios y coordenadas como texto decimal y booleanos 0/1.
// Incluye datos privados para comprobar que nunca llegan a la respuesta.
const fila = {
  id: 1, usuarioId: 10, nombre: 'Ana Demo', especialidad: 'Nutrición', descripcion: 'Atención nutricional', comuna: 'Melipilla',
  modalidad: 'presencial', verificado: 0, ubicacionLat: '-33.6860000', ubicacionLng: '-71.2150000',
  establecimientoNombre: 'Consulta Demo', establecimientoDireccion: 'Melipilla', promedio: '4.5000', totalResenas: 2n,
  distanciaKm: null, esFavorito: 1n, correo: 'privado@example.test', passwordHash: 'privado',
};
const fichaEsperada = {
  id: 1, nombre: 'Ana Demo', especialidad: 'Nutrición', descripcion: 'Atención nutricional', comuna: 'Melipilla', modalidad: 'presencial',
  verificado: false, ubicacionLat: -33.686, ubicacionLng: -71.215, establecimiento: { nombre: 'Consulta Demo', direccion: 'Melipilla' },
  calificacion: { promedio: 4.5, total: 2 }, distanciaKm: null, esFavorito: true,
};
const filtrosPorDefecto = {
  usuarioId: 1, q: '', especialidad: '', comuna: '', modalidad: '', calificacionMin: null, ubicacion: null,
  distanciaKm: null, orden: 'nombre', pagina: 1, limite: 12,
};
beforeEach(() => jest.resetAllMocks());

describe('GET /api/profesionales', () => {
  test('HU-03: lista fichas sin filtrar, con calificación y favorito, y excluye información privada', async () => {
    modelo.listar.mockResolvedValue({ filas: [fila], total: 1 });
    const res = await consulta('/api/profesionales');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ profesionales: [fichaEsperada], pagina: 1, total: 1, totalPaginas: 1, hayMas: false });
    expect(JSON.stringify(res.body)).not.toMatch(/privado|usuarioId/);
    expect(modelo.listar).toHaveBeenCalledWith(filtrosPorDefecto);
  });

  test('FS-HU-22: combina texto, especialidad, comuna, modalidad, calificación y orden, retirando espacios', async () => {
    modelo.listar.mockResolvedValue({ filas: [], total: 0 });
    const res = await consulta('/api/profesionales').query({
      q: ' nutri ', especialidad: ' Nutrición ', comuna: ' Ñuñoa ', modalidad: 'online', calificacionMin: '4', orden: 'calificacion', pagina: '2',
    });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ profesionales: [], pagina: 2, total: 0, totalPaginas: 0, hayMas: false });
    expect(modelo.listar).toHaveBeenCalledWith({
      ...filtrosPorDefecto, q: 'nutri', especialidad: 'Nutrición', comuna: 'Ñuñoa', modalidad: 'online', calificacionMin: 4, orden: 'calificacion', pagina: 2,
    });
  });

  test('FS-HU-05: filtra por distancia con la ubicación redondeada a 3 decimales y ordena por cercanía', async () => {
    modelo.listar.mockResolvedValue({ filas: [{ ...fila, distanciaKm: 2.3456 }], total: 1 });
    const res = await consulta('/api/profesionales').query({ lat: '-33.437123', lng: '-70.650456', distanciaKm: '5', orden: 'cercania' });
    expect(res.status).toBe(200);
    expect(res.body.profesionales[0].distanciaKm).toBe(2.3);
    expect(modelo.listar).toHaveBeenCalledWith({
      ...filtrosPorDefecto, ubicacion: { lat: -33.437, lng: -70.65 }, distanciaKm: 5, orden: 'cercania',
    });
  });

  test('informa el total, las páginas y si hay más resultados', async () => {
    modelo.listar.mockResolvedValue({ filas: Array.from({ length: 12 }, (_, i) => ({ ...fila, id: i + 1 })), total: 30 });
    const res = await consulta('/api/profesionales');
    expect(res.body).toMatchObject({ total: 30, totalPaginas: 3, hayMas: true });
    expect(res.body.profesionales).toHaveLength(12);
  });

  test('el Inicio pide los destacados con un límite menor', async () => {
    modelo.listar.mockResolvedValue({ filas: [fila], total: 9 });
    const res = await consulta('/api/profesionales?orden=destacados&limite=4');
    expect(res.status).toBe(200);
    expect(modelo.listar).toHaveBeenCalledWith({ ...filtrosPorDefecto, orden: 'destacados', limite: 4 });
    expect(res.body.totalPaginas).toBe(3);
  });

  test('sin reseñas el promedio es nulo y sin establecimiento conserva las coordenadas', async () => {
    modelo.listar.mockResolvedValue({ filas: [{ ...fila, promedio: 0, totalResenas: 0n, establecimientoNombre: null, esFavorito: 0n }], total: 1 });
    const res = await consulta('/api/profesionales');
    expect(res.body.profesionales[0]).toMatchObject({
      calificacion: { promedio: null, total: 0 }, establecimiento: null, ubicacionLat: -33.686, esFavorito: false,
    });
  });

  test.each([
    ['página 0', { pagina: '0' }], ['página decimal', { pagina: '1.5' }], ['página no numérica', { pagina: 'abc' }],
    ['búsqueda demasiado larga', { q: 'a'.repeat(101) }], ['especialidad demasiado larga', { especialidad: 'a'.repeat(101) }],
    ['comuna demasiado larga', { comuna: 'a'.repeat(81) }], ['modalidad inválida', { modalidad: 'ambas' }],
    ['calificación 0', { calificacionMin: '0' }], ['calificación 6', { calificacionMin: '6' }],
    ['orden inválido', { orden: 'precio' }], ['límite mayor a 12', { limite: '13' }],
    ['latitud sin longitud', { lat: '-33.4' }], ['latitud fuera de rango', { lat: '-91', lng: '-70' }],
    ['distancia sin ubicación', { distanciaKm: '5' }], ['distancia fuera del catálogo', { lat: '-33.4', lng: '-70.6', distanciaKm: '7' }],
    ['cercanía sin ubicación', { orden: 'cercania' }],
  ])('rechaza %s con 400 sin consultar la base de datos', async (_, parametros) => {
    const res = await consulta('/api/profesionales').query(parametros);
    expect(res.status).toBe(400);
    expect(modelo.listar).not.toHaveBeenCalled();
  });

  test('rechaza parámetros repetidos sin generar un error interno', async () => {
    for (const ruta of ['especialidad=A&especialidad=B', 'pagina=1&pagina=2', 'comuna=A&comuna=B', 'q=a&q=b']) {
      expect((await consulta(`/api/profesionales?${ruta}`)).status).toBe(400);
    }
    expect(modelo.listar).not.toHaveBeenCalled();
  });
});

test('GET /api/profesionales/filtros devuelve especialidades y comunas disponibles', async () => {
  modelo.filtros.mockResolvedValue({ especialidades: ['Kinesiología', 'Nutrición'], comunas: ['Ñuñoa', 'Providencia'] });
  const res = await consulta('/api/profesionales/filtros');
  expect(res.status).toBe(200);
  expect(res.body).toEqual({ especialidades: ['Kinesiología', 'Nutrición'], comunas: ['Ñuñoa', 'Providencia'] });
});

describe('GET /api/profesionales/:id (ficha)', () => {
  beforeEach(() => {
    resenaModel.distribucion.mockResolvedValue([{ puntaje: 5, cantidad: 1 }, { puntaje: 4, cantidad: 1 }]);
    resenaModel.buscarDelUsuario.mockResolvedValue(null);
  });

  test('devuelve la ficha, el resumen de reseñas y si la persona puede calificar', async () => {
    modelo.buscarPorId.mockResolvedValue(fila);
    const res = await consulta('/api/profesionales/1');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      profesional: fichaEsperada,
      resumenResenas: { promedio: 4.5, total: 2, distribucion: { 5: 1, 4: 1, 3: 0, 2: 0, 1: 0 } },
      miResena: null,
      puedeResenar: true,
    });
    expect(modelo.buscarPorId).toHaveBeenCalledWith(1, 1);
  });

  test('incluye la reseña propia con el nombre abreviado del autor', async () => {
    modelo.buscarPorId.mockResolvedValue(fila);
    resenaModel.buscarDelUsuario.mockResolvedValue({
      id: 7, usuarioId: 1, puntaje: 4, comentario: 'Muy buena atención', fechaCreacion: new Date('2026-10-01T12:00:00Z'),
      fechaActualizacion: new Date('2026-10-02T12:00:00Z'), usuario: { nombre: 'rodrigo cárcamo rojas' },
    });
    const res = await consulta('/api/profesionales/1');
    expect(res.body.miResena).toEqual({
      id: 7, autor: 'rodrigo C.', puntaje: 4, comentario: 'Muy buena atención', fecha: '2026-10-02T12:00:00.000Z', propia: true,
    });
  });

  test('un profesional no puede calificarse a sí mismo ni calificar a otros', async () => {
    modelo.buscarPorId.mockResolvedValue(fila);
    expect((await consulta('/api/profesionales/1', firmar('usuario', '10'))).body.puedeResenar).toBe(false);
    expect((await consulta('/api/profesionales/1', firmar('profesional', '20'))).body.puedeResenar).toBe(false);
  });

  test('responde 404 si el profesional no existe y 400 si el identificador no es válido', async () => {
    modelo.buscarPorId.mockResolvedValue(null);
    expect((await consulta('/api/profesionales/999')).status).toBe(404);
    expect((await consulta('/api/profesionales/abc')).status).toBe(400);
  });
});

test.each(['/api/profesionales', '/api/profesionales/filtros', '/api/profesionales/1', '/api/profesionales/1/resenas'])('exige sesión para %s', async (ruta) => {
  expect((await request(app).get(ruta)).status).toBe(401);
  expect((await request(app).get(ruta).set('Authorization', 'Bearer invalido')).status).toBe(401);
  const expirado = jwt.sign({ rol: 'usuario' }, process.env.JWT_SECRET, { subject: '1', expiresIn: -10 });
  expect((await request(app).get(ruta).set('Authorization', `Bearer ${expirado}`)).status).toBe(401);
  expect(modelo.listar).not.toHaveBeenCalled();
});

test('la entrega HU-03 no expone una consulta a Google Places', async () => {
  expect((await request(app).get('/api/google/profesionales?comuna=Melipilla')).status).toBe(404);
});

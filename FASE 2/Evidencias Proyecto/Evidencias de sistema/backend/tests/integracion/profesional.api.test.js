// Directorio de profesionales: listado con búsqueda y filtros (FS-HU-03, FS-HU-05, FS-HU-22) y ficha. El acceso a datos se simula.
jest.mock('../../src/models/profesional.model');
jest.mock('../../src/models/resena.model');
const request = require('supertest');
const { cifrarCuenta } = require('../../src/utils/fotos');
const jwt = require('jsonwebtoken');
const app = require('../../src/app');
const modelo = require('../../src/models/profesional.model');
const resenaModel = require('../../src/models/resena.model');

const firmar = (rol = 'usuario', sub = '1') => jwt.sign({ rol }, process.env.JWT_SECRET, { subject: sub, expiresIn: '1h' });
const consulta = (ruta, token = firmar()) => request(app).get(ruta).set('Authorization', `Bearer ${token}`);

// Fila tal como la entrega MySQL: conteos BigInt, promedios y coordenadas como texto decimal y booleanos 0/1.
// Incluye datos privados para comprobar que nunca llegan a la respuesta.
const fila = {
  id: 1, usuarioId: 10, nombre: 'Ana Demo', especialidad: 'Nutrición', comuna: 'Melipilla',
  direccion: 'Av. Demo 123', modalidad: 'presencial', verificado: 0, ubicacionLat: '-33.6860000', ubicacionLng: '-71.2150000',
  establecimientoNombre: 'Consulta Demo', establecimientoDireccion: 'Melipilla', promedio: '4.5000', totalResenas: 2n,
  distanciaKm: null, esFavorito: 1n, correo: 'privado@example.test', passwordHash: 'privado',
};
const fichaEsperada = {
  // Sin foto de perfil (la fila no trae fotoClave): fotoUrl en null (15-11-2026).
  id: 1, nombre: 'Ana Demo', fotoUrl: null, especialidad: 'Nutrición', comuna: 'Melipilla', direccion: 'Av. Demo 123',
  modalidad: 'presencial', verificado: false, ubicacionLat: -33.686, ubicacionLng: -71.215, establecimiento: { nombre: 'Consulta Demo', direccion: 'Melipilla' },
  calificacion: { promedio: 4.5, total: 2 }, distanciaKm: null, esFavorito: true,
  // Experiencia (FS-HU-29) y precio referencial, vacíos si el profesional no los completó (09-11-2026).
  aniosExperiencia: null, formacion: [], atiendeA: [], registroSis: null, precioDesde: null,
};
// En el buscador cada tarjeta trae además su presentación resumida (16-11-2026), su próxima hora libre y hasta tres
// horas para elegir.
const tarjetaEsperada = { ...fichaEsperada, presentacion: null, proximaHora: null, proximasHoras: [] };
const filtrosPorDefecto = {
  usuarioId: 1, q: '', especialidad: '', comuna: '', region: '', modalidad: '', calificacionMin: null, soloVerificados: false, ubicacion: null,
  distanciaKm: null, orden: 'nombre', pagina: 1, limite: 12,
  // Momento actual en Chile para las horas libres y, sin filtro de disponibilidad, sin fecha límite.
  ahora: expect.objectContaining({ hoy: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/) }), conHorasHasta: null,
};
beforeEach(() => {
  jest.resetAllMocks();
  modelo.proximasHoras.mockResolvedValue([]);
  // Por defecto la persona ya tuvo una cita confirmada con el profesional (reseñas verificadas, 09-11-2026).
  resenaModel.citaVerificable.mockResolvedValue({ id: 30 });
});

describe('GET /api/profesionales', () => {
  test('HU-03: lista fichas sin filtrar, con calificación y favorito, y excluye información privada', async () => {
    modelo.listar.mockResolvedValue({ filas: [fila], total: 1 });
    const res = await consulta('/api/profesionales');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ profesionales: [tarjetaEsperada], pagina: 1, total: 1, totalPaginas: 1, hayMas: false });
    expect(JSON.stringify(res.body)).not.toMatch(/privado|usuarioId/);
    expect(modelo.listar).toHaveBeenCalledWith(filtrosPorDefecto);
  });

  // Pedido del PO del 16-11-2026: en el buscador la presentación va resumida; completa, solo en la ficha.
  test('la tarjeta trae la presentación resumida, cortada en una palabra completa', async () => {
    const presentacion = 'Soy Ana, nutricionista deportiva hace 8 años. Me dedico a acompañar a corredores y personas que empiezan a entrenar. Me encanta el trail running y cocinar recetas simples.';
    modelo.listar.mockResolvedValue({ filas: [{ ...fila, presentacion }], total: 1 });
    const { body } = await consulta('/api/profesionales');
    const resumen = body.profesionales[0].presentacion;
    expect(resumen).toBe('Soy Ana, nutricionista deportiva hace 8 años. Me dedico a acompañar a corredores y personas que empiezan a entrenar. Me encanta el trail running y cocinar…');
    expect(resumen.length).toBeLessThanOrEqual(161);
    expect(body.profesionales[0]).not.toHaveProperty('descripcion');
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

  // SC-47: la tarjeta de recomendación del asistente puede pedir solo los verificados.
  test('SC-47: filtra solo los profesionales verificados y rechaza otro valor', async () => {
    modelo.listar.mockResolvedValue({ filas: [{ ...fila, verificado: 1 }], total: 1 });
    const res = await consulta('/api/profesionales').query({ especialidad: 'Nutrición', verificado: 'true', orden: 'calificacion', limite: '3' });
    expect(res.status).toBe(200);
    expect(modelo.listar).toHaveBeenCalledWith({
      ...filtrosPorDefecto, especialidad: 'Nutrición', soloVerificados: true, orden: 'calificacion', limite: 3,
    });
    const invalida = await consulta('/api/profesionales').query({ verificado: 'si' });
    expect(invalida.status).toBe(400);
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

test('GET /api/profesionales/filtros devuelve especialidades y comunas disponibles, agrupadas por región', async () => {
  // «san antonio» se guardó sin mayúsculas: se muestra con su nombre oficial y en su región (14-11-2026).
  modelo.filtros.mockResolvedValue({ especialidades: ['Kinesiología', 'Nutrición'], comunas: ['Ñuñoa', 'Providencia', 'san antonio'] });
  const res = await consulta('/api/profesionales/filtros');
  expect(res.status).toBe(200);
  expect(res.body).toEqual({
    especialidades: ['Kinesiología', 'Nutrición'],
    regiones: [
      { nombre: 'Valparaíso', comunas: ['San Antonio'] },
      { nombre: 'Metropolitana', comunas: ['Ñuñoa', 'Providencia'] },
    ],
    comunas: ['Ñuñoa', 'Providencia', 'San Antonio'],
  });
});

test('GET /api/profesionales filtra por región y rechaza una que no existe', async () => {
  modelo.listar.mockResolvedValue({ filas: [], total: 0 });
  modelo.proximasHoras.mockResolvedValue([]);
  expect((await consulta('/api/profesionales?region=Metropolitana')).status).toBe(200);
  expect(modelo.listar).toHaveBeenLastCalledWith(expect.objectContaining({ region: 'Metropolitana', comuna: '' }));
  const mala = await consulta('/api/profesionales?region=Narnia');
  expect(mala.status).toBe(400);
  expect(mala.body.detalles.region).toBe('Selecciona una región de Chile');
});

test('GET /api/profesionales busca la comuna con los espacios unidos, igual que se guarda (15-11-2026)', async () => {
  modelo.listar.mockResolvedValue({ filas: [], total: 0 });
  modelo.proximasHoras.mockResolvedValue([]);
  expect((await consulta('/api/profesionales?comuna=San%20%20%20Antonio')).status).toBe(200);
  expect(modelo.listar).toHaveBeenLastCalledWith(expect.objectContaining({ comuna: 'San Antonio' }));
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
      // Sin presentación escrita; la región sale de la comuna (15-11-2026).
      profesional: { ...fichaEsperada, presentacion: null, region: 'Región Metropolitana de Santiago' },
      resumenResenas: { promedio: 4.5, total: 2, distribucion: { 5: 1, 4: 1, 3: 0, 2: 0, 1: 0 } },
      miResena: null,
      puedeResenar: true,
    });
    expect(modelo.buscarPorId).toHaveBeenCalledWith(1, 1);
  });

  // Pedido del PO del 15-11-2026: la ficha pública abre con la presentación del profesional y muestra su región.
  test('incluye la presentación del profesional y la región de su comuna, que no aplica si atiende solo online', async () => {
    modelo.buscarPorId.mockResolvedValue({ ...fila, comuna: 'san antonio', presentacion: '  Soy Ana, nutricionista deportiva.  ' });
    const { profesional } = (await consulta('/api/profesionales/1')).body;
    expect(profesional).toMatchObject({ presentacion: 'Soy Ana, nutricionista deportiva.', comuna: 'San Antonio', region: 'Región de Valparaíso' });
    modelo.buscarPorId.mockResolvedValue({ ...fila, modalidad: 'online', presentacion: '' });
    expect((await consulta('/api/profesionales/1')).body.profesional).toMatchObject({ presentacion: null, comuna: null, region: null });
  });

  test('incluye la reseña propia con el nombre abreviado del autor', async () => {
    modelo.buscarPorId.mockResolvedValue(fila);
    resenaModel.buscarDelUsuario.mockResolvedValue({
      id: 7, usuarioId: 1, puntaje: 4, comentario: 'Muy buena atención', fechaCreacion: new Date('2026-10-01T12:00:00Z'),
      fechaActualizacion: new Date('2026-10-02T12:00:00Z'), usuario: { nombre: 'rodrigo cárcamo rojas' },
    });
    const res = await consulta('/api/profesionales/1');
    expect(res.body.miResena).toEqual({
      id: 7, autor: 'rodrigo C.', puntaje: 4, comentario: 'Muy buena atención', fecha: '2026-10-02T12:00:00.000Z', propia: true, verificada: false,
    });
  });

  // Fotos de perfil en todos los lugares (15-11-2026): la ficha y el buscador entregan la dirección de la foto, armada con
  // la clave que calcula MySQL, nunca la foto ni el id de la cuenta.
  test('entrega la dirección de la foto del profesional cuando tiene una', async () => {
    modelo.buscarPorId.mockResolvedValue({ ...fila, fotoClave: '0123456789abcdef' });
    const { profesional } = (await consulta('/api/profesionales/1')).body;
    // Enlace opaco (revisión del PR 62): la cuenta va cifrada, no su id.
    expect(profesional.fotoUrl).toBe(`/api/fotos/${cifrarCuenta(10)}/0123456789abcdef`);
    expect(profesional.fotoUrl).not.toMatch(/\/10\//);
    expect(profesional).not.toHaveProperty('usuarioId');
    expect(profesional).not.toHaveProperty('fotoClave');
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

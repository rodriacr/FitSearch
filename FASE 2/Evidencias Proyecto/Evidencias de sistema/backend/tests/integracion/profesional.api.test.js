jest.mock('../../src/models/profesional.model');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const token = jwt.sign({ rol: 'usuario' }, process.env.JWT_SECRET, { subject: '1', expiresIn: '1h' });
const consulta = (ruta) => request(app).get(ruta).set('Authorization', `Bearer ${token}`);
const app = require('../../src/app');
const modelo = require('../../src/models/profesional.model');
const ficha = {
  id: 1, especialidad: 'Nutrición', descripcion: 'Atención nutricional', ubicacionLat: '-33.6860000', ubicacionLng: '-71.2150000',
  usuario: { nombre: 'Ana Demo', correo: 'privado@example.test', passwordHash: 'privado', informacionSalud: { alergias: ['ninguna'] } },
  establecimiento: { nombre: 'Consulta Demo', direccion: 'Melipilla' }, usuarioId: 10,
};
beforeEach(() => jest.resetAllMocks());

test('HU-03: lista fichas sin filtrar y excluye información privada', async () => {
  modelo.listar.mockResolvedValue([ficha]);
  const res = await consulta('/api/profesionales');
  expect(res.status).toBe(200);
  expect(res.body).toEqual({ pagina: 1, hayMas: false, profesionales: [{
    id: 1, nombre: 'Ana Demo', especialidad: 'Nutrición', descripcion: 'Atención nutricional', ubicacionLat: -33.686, ubicacionLng: -71.215,
    establecimiento: { nombre: 'Consulta Demo', direccion: 'Melipilla' },
  }] });
  expect(modelo.listar).toHaveBeenCalledWith({ especialidad: '', comuna: '', pagina: 1, limite: 12 });
});
test('aplica especialidad y página, retirando espacios', async () => {
  modelo.listar.mockResolvedValue([ficha]);
  const res = await consulta('/api/profesionales').query({ especialidad: ' Nutrición ', pagina: '2' });
  expect(res.status).toBe(200);
  expect(modelo.listar).toHaveBeenCalledWith({ especialidad: 'Nutrición', comuna: '', pagina: 2, limite: 12 });
});
test('sin coincidencias devuelve lista vacía', async () => {
  modelo.listar.mockResolvedValue([]);
  const res = await consulta('/api/profesionales?especialidad=Inexistente');
  expect(res.status).toBe(200);
  expect(res.body).toEqual({ profesionales: [], pagina: 1, hayMas: false });
});
test('pagina con 12 fichas como máximo y señala si hay más', async () => {
  modelo.listar.mockResolvedValue(Array.from({ length: 13 }, (_, i) => ({ ...ficha, id: i + 1 })));
  const res = await consulta('/api/profesionales');
  expect(res.body.profesionales).toHaveLength(12);
  expect(res.body.hayMas).toBe(true);
});
test('sin establecimiento conserva las coordenadas de atención', async () => {
  modelo.listar.mockResolvedValue([{ ...ficha, establecimiento: null }]);
  const res = await consulta('/api/profesionales');
  expect(res.body.profesionales[0]).toMatchObject({ establecimiento: null, ubicacionLat: -33.686 });
});
test.each(['0', '-1', '1.5', 'abc', '100001'])('rechaza página %s', async (pagina) => {
  const res = await consulta('/api/profesionales').query({ pagina });
  expect(res.status).toBe(400);
  expect(modelo.listar).not.toHaveBeenCalled();
});
test('rechaza especialidades demasiado largas', async () => {
  expect((await consulta('/api/profesionales').query({ especialidad: 'a'.repeat(101) })).status).toBe(400);
  expect(modelo.listar).not.toHaveBeenCalled();
});
test('rechaza parámetros repetidos sin generar un error interno', async () => {
  expect((await consulta('/api/profesionales?especialidad=A&especialidad=B')).status).toBe(400);
  expect((await consulta('/api/profesionales?pagina=1&pagina=2')).status).toBe(400);
});
test('catálogo de especialidades', async () => {
  modelo.especialidades.mockResolvedValue(['Kinesiología', 'Nutrición']);
  const res = await consulta('/api/profesionales/especialidades');
  expect(res.status).toBe(200);
  expect(res.body).toEqual({ especialidades: ['Kinesiología', 'Nutrición'] });
});

test('combina comuna y especialidad en la consulta', async () => {
  modelo.listar.mockResolvedValue([]);
  const res = await consulta('/api/profesionales').query({ comuna: ' Melipilla ', especialidad: 'Nutrición' });
  expect(res.status).toBe(200);
  expect(modelo.listar).toHaveBeenCalledWith({ comuna: 'Melipilla', especialidad: 'Nutrición', pagina: 1, limite: 12 });
});
test('rechaza comuna repetida o demasiado larga', async () => {
  expect((await consulta('/api/profesionales?comuna=A&comuna=B')).status).toBe(400);
  expect((await consulta('/api/profesionales').query({ comuna: 'a'.repeat(151) })).status).toBe(400);
});

test.each(['/api/profesionales', '/api/profesionales/especialidades'])('exige sesión para %s', async (ruta) => {
  expect((await request(app).get(ruta)).status).toBe(401);
  expect((await request(app).get(ruta).set('Authorization', 'Bearer invalido')).status).toBe(401);
  const expirado = jwt.sign({ rol: 'usuario' }, process.env.JWT_SECRET, { subject: '1', expiresIn: -10 });
  expect((await request(app).get(ruta).set('Authorization', `Bearer ${expirado}`)).status).toBe(401);
  expect(modelo.listar).not.toHaveBeenCalled();
  expect(modelo.especialidades).not.toHaveBeenCalled();
});

test('la entrega HU-03 no expone una consulta a Google Places', async () => {
  expect((await request(app).get('/api/google/profesionales?comuna=Melipilla')).status).toBe(404);
});

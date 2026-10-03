// Profesionales favoritos (FS-HU-23). El acceso a datos se simula.
jest.mock('../../src/models/profesional.model');
jest.mock('../../src/models/favorito.model');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../src/app');
const profesionalModel = require('../../src/models/profesional.model');
const favoritoModel = require('../../src/models/favorito.model');

const token = jwt.sign({ rol: 'usuario' }, process.env.JWT_SECRET, { subject: '1', expiresIn: '1h' });
const conSesion = (peticion) => peticion.set('Authorization', `Bearer ${token}`);
beforeEach(() => jest.resetAllMocks());

test('escenario 1: lista solo los favoritos del usuario con el formato de ficha del directorio', async () => {
  profesionalModel.listar.mockResolvedValue({ filas: [{
    id: 3, nombre: 'Camila Demo', especialidad: 'Kinesiología', descripcion: null, comuna: 'Ñuñoa', modalidad: 'ambas', verificado: 0,
    ubicacionLat: '-33.45', ubicacionLng: '-70.59', establecimientoNombre: null, promedio: 0, totalResenas: 0n, distanciaKm: null, esFavorito: 1n,
  }], total: 1 });
  const res = await conSesion(request(app).get('/api/favoritos'));
  expect(res.status).toBe(200);
  expect(res.body).toMatchObject({ total: 1, profesionales: [{ id: 3, nombre: 'Camila Demo', esFavorito: true }] });
  expect(profesionalModel.listar).toHaveBeenCalledWith({ usuarioId: 1, soloFavoritosDe: 1, orden: 'nombre', pagina: 1, limite: 12 });
});

test('escenario 2: agrega un favorito; repetirlo no falla', async () => {
  profesionalModel.existe.mockResolvedValue({ id: 3, usuarioId: 30 });
  favoritoModel.agregar.mockResolvedValue({});
  for (let vez = 0; vez < 2; vez += 1) {
    const res = await conSesion(request(app).put('/api/favoritos/3'));
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ profesionalId: 3, esFavorito: true });
  }
  expect(favoritoModel.agregar).toHaveBeenCalledWith(1, 3);
});

test('escenario 3: quita un favorito aunque ya no estuviera guardado', async () => {
  favoritoModel.quitar.mockResolvedValue({ count: 0 });
  const res = await conSesion(request(app).delete('/api/favoritos/3'));
  expect(res.status).toBe(200);
  expect(res.body).toEqual({ profesionalId: 3, esFavorito: false });
  expect(favoritoModel.quitar).toHaveBeenCalledWith(1, 3);
});

test('responde 404 si el profesional no existe, 400 con un identificador inválido y 401 sin sesión', async () => {
  profesionalModel.existe.mockResolvedValue(null);
  expect((await conSesion(request(app).put('/api/favoritos/99'))).status).toBe(404);
  expect((await conSesion(request(app).put('/api/favoritos/abc'))).status).toBe(400);
  expect((await request(app).get('/api/favoritos')).status).toBe(401);
  expect((await request(app).put('/api/favoritos/3')).status).toBe(401);
  expect(favoritoModel.agregar).not.toHaveBeenCalled();
});

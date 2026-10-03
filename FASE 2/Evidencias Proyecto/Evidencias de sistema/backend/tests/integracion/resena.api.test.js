// Calificaciones y reseñas de profesionales (FS-HU-24). El acceso a datos se simula.
jest.mock('../../src/models/profesional.model');
jest.mock('../../src/models/resena.model');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../src/app');
const profesionalModel = require('../../src/models/profesional.model');
const resenaModel = require('../../src/models/resena.model');

const firmar = (rol = 'usuario', sub = '1') => jwt.sign({ rol }, process.env.JWT_SECRET, { subject: sub, expiresIn: '1h' });
const conSesion = (peticion, token = firmar()) => peticion.set('Authorization', `Bearer ${token}`);
const fecha = new Date('2026-10-02T15:00:00Z');
const resena = (sobrescribir = {}) => ({
  id: 5, usuarioId: 1, puntaje: 5, comentario: 'Excelente atención', fechaCreacion: fecha, fechaActualizacion: fecha,
  usuario: { nombre: 'Ana Pérez' }, ...sobrescribir,
});

beforeEach(() => {
  jest.resetAllMocks();
  profesionalModel.existe.mockResolvedValue({ id: 3, usuarioId: 30 });
  resenaModel.distribucion.mockResolvedValue([{ puntaje: 5, cantidad: 1 }]);
});

describe('GET /api/profesionales/:id/resenas', () => {
  test('lista las reseñas de la página con el autor abreviado y marca la propia', async () => {
    resenaModel.listar.mockResolvedValue({ filas: [resena(), resena({ id: 6, usuarioId: 2, puntaje: 3, comentario: null, usuario: { nombre: 'Luis' } })], total: 7 });
    const res = await conSesion(request(app).get('/api/profesionales/3/resenas?pagina=2'));
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      resenas: [
        { id: 5, autor: 'Ana P.', puntaje: 5, comentario: 'Excelente atención', fecha: fecha.toISOString(), propia: true },
        { id: 6, autor: 'Luis', puntaje: 3, comentario: null, fecha: fecha.toISOString(), propia: false },
      ],
      pagina: 2, total: 7, totalPaginas: 2,
    });
    expect(resenaModel.listar).toHaveBeenCalledWith(3, { pagina: 2, limite: 5 });
  });

  test('un profesional también puede leerlas; 404 si el profesional no existe', async () => {
    resenaModel.listar.mockResolvedValue({ filas: [], total: 0 });
    expect((await conSesion(request(app).get('/api/profesionales/3/resenas'), firmar('profesional', '30'))).status).toBe(200);
    profesionalModel.existe.mockResolvedValue(null);
    expect((await conSesion(request(app).get('/api/profesionales/99/resenas'))).status).toBe(404);
  });
});

describe('PUT /api/profesionales/:id/resenas', () => {
  test('escenario 1: crea la reseña (201) con el comentario sin espacios sobrantes y devuelve el resumen', async () => {
    resenaModel.guardar.mockResolvedValue({ fila: resena({ puntaje: 4, comentario: 'Muy buena atención' }), creada: true });
    const res = await conSesion(request(app).put('/api/profesionales/3/resenas')).send({ puntaje: 4, comentario: '  Muy buena atención  ' });
    expect(res.status).toBe(201);
    expect(res.body.resena).toMatchObject({ puntaje: 4, comentario: 'Muy buena atención', propia: true });
    expect(res.body.resumenResenas).toEqual({ promedio: 5, total: 1, distribucion: { 5: 1, 4: 0, 3: 0, 2: 0, 1: 0 } });
    expect(resenaModel.guardar).toHaveBeenCalledWith(1, 3, { puntaje: 4, comentario: 'Muy buena atención' });
  });

  test('escenario 2: calificar de nuevo reemplaza la reseña (200) y un comentario vacío no se guarda', async () => {
    resenaModel.guardar.mockResolvedValue({ fila: resena({ comentario: null }), creada: false });
    const res = await conSesion(request(app).put('/api/profesionales/3/resenas')).send({ puntaje: '5', comentario: '   ' });
    expect(res.status).toBe(200);
    expect(resenaModel.guardar).toHaveBeenCalledWith(1, 3, { puntaje: 5, comentario: null });
  });

  test.each([
    ['sin puntaje', {}], ['puntaje 0', { puntaje: 0 }], ['puntaje 6', { puntaje: 6 }], ['puntaje decimal', { puntaje: 4.5 }],
    ['comentario corto', { puntaje: 4, comentario: 'Bien' }], ['comentario largo', { puntaje: 4, comentario: 'a'.repeat(501) }],
    ['comentario que no es texto', { puntaje: 4, comentario: 123 }],
  ])('rechaza %s con 400', async (_, cuerpo) => {
    const res = await conSesion(request(app).put('/api/profesionales/3/resenas')).send(cuerpo);
    expect(res.status).toBe(400);
    expect(resenaModel.guardar).not.toHaveBeenCalled();
  });

  test('escenario 3: solo las cuentas de usuario califican y nadie califica su propia ficha', async () => {
    expect((await conSesion(request(app).put('/api/profesionales/3/resenas'), firmar('profesional', '20')).send({ puntaje: 5 })).status).toBe(403);
    expect((await conSesion(request(app).put('/api/profesionales/3/resenas'), firmar('usuario', '30')).send({ puntaje: 5 })).status).toBe(403);
    expect(resenaModel.guardar).not.toHaveBeenCalled();
  });

  test('responde 404 si el profesional no existe y 401 sin sesión', async () => {
    profesionalModel.existe.mockResolvedValue(null);
    expect((await conSesion(request(app).put('/api/profesionales/99/resenas')).send({ puntaje: 5 })).status).toBe(404);
    expect((await request(app).put('/api/profesionales/3/resenas').send({ puntaje: 5 })).status).toBe(401);
  });
});

describe('DELETE /api/profesionales/:id/resenas', () => {
  test('elimina la reseña propia y devuelve el resumen actualizado', async () => {
    resenaModel.eliminar.mockResolvedValue({ count: 1 });
    resenaModel.distribucion.mockResolvedValue([]);
    const res = await conSesion(request(app).delete('/api/profesionales/3/resenas'));
    expect(res.status).toBe(200);
    expect(res.body.resumenResenas).toEqual({ promedio: null, total: 0, distribucion: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } });
    expect(resenaModel.eliminar).toHaveBeenCalledWith(1, 3);
  });

  test('responde 404 si no había calificado y 403 a un profesional', async () => {
    resenaModel.eliminar.mockResolvedValue({ count: 0 });
    expect((await conSesion(request(app).delete('/api/profesionales/3/resenas'))).status).toBe(404);
    expect((await conSesion(request(app).delete('/api/profesionales/3/resenas'), firmar('profesional', '20'))).status).toBe(403);
  });
});

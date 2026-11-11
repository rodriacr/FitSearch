// Registro de agua (FS-HU-33): el agua de hoy, sumar vasos o mililitros y deshacer. El acceso a datos se simula.
jest.mock('../../src/models/agua.model');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../src/app');
const modelo = require('../../src/models/agua.model');
const ErrorHttp = require('../../src/utils/ErrorHttp');

const firmar = (rol = 'usuario', sub = '1') => jwt.sign({ rol }, process.env.JWT_SECRET, { subject: sub, expiresIn: '1h' });
const conSesion = (peticion, token = firmar()) => peticion.set('Authorization', `Bearer ${token}`);
const FECHA = expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/);

// 15:30 en UTC son las 12:30 en Santiago en noviembre (horario de verano, UTC-3).
const filas = [
  { id: 4, ml: 250, fechaCreacion: new Date('2026-11-04T12:10:00Z') },
  { id: 5, ml: 500, fechaCreacion: new Date('2026-11-04T15:30:00Z') },
];
beforeEach(() => jest.resetAllMocks());

describe('GET /api/agua', () => {
  test('entrega el total de hoy frente a la meta, con cada suma y su hora en Chile', async () => {
    modelo.delDia.mockResolvedValue(filas);
    const res = await conSesion(request(app).get('/api/agua'));
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      fecha: FECHA, hoy: FECHA, totalMl: 750, metaMl: 2000, vasoMl: 250,
      registros: [{ id: 4, ml: 250, hora: '09:10' }, { id: 5, ml: 500, hora: '12:30' }],
    });
    expect(modelo.delDia).toHaveBeenCalledWith(1, FECHA);
  });

  test('el Resumen nutricional de Comidas pide un día anterior', async () => {
    modelo.delDia.mockResolvedValue([filas[0]]);
    const res = await conSesion(request(app).get('/api/agua?fecha=2026-10-01'));
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ fecha: '2026-10-01', totalMl: 250 });
    expect(modelo.delDia).toHaveBeenCalledWith(1, '2026-10-01');
  });

  test('no consulta un día que aún no llega ni una fecha mal escrita', async () => {
    const futura = await conSesion(request(app).get('/api/agua?fecha=2999-01-01'));
    expect(futura.status).toBe(400);
    expect(futura.body.error).toBe('No hay registros de agua en días que aún no llegan');
    expect((await conSesion(request(app).get('/api/agua?fecha=01-10-2026'))).status).toBe(400);
    expect(modelo.delDia).not.toHaveBeenCalled();
  });

  test('sin registros, el total es 0', async () => {
    modelo.delDia.mockResolvedValue([]);
    const res = await conSesion(request(app).get('/api/agua'));
    expect(res.body).toMatchObject({ totalMl: 0, registros: [] });
  });

  test('es de la cuenta de usuario: pide sesión y el profesional no entra', async () => {
    expect((await request(app).get('/api/agua')).status).toBe(401);
    expect((await conSesion(request(app).get('/api/agua'), firmar('profesional'))).status).toBe(403);
    expect(modelo.delDia).not.toHaveBeenCalled();
  });
});

describe('POST /api/agua', () => {
  test('suma un vaso al día de hoy y responde el día actualizado', async () => {
    modelo.agregar.mockResolvedValue([...filas, { id: 6, ml: 250, fechaCreacion: new Date('2026-11-04T16:00:00Z') }]);
    const res = await conSesion(request(app).post('/api/agua')).send({ ml: 250 });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ totalMl: 1000, metaMl: 2000 });
    expect(res.body.registros.at(-1)).toEqual({ id: 6, ml: 250, hora: '13:00' });
    expect(modelo.agregar).toHaveBeenCalledWith(1, FECHA, 250);
  });

  test('acepta los mililitros como texto numérico', async () => {
    modelo.agregar.mockResolvedValue(filas);
    expect((await conSesion(request(app).post('/api/agua')).send({ ml: '330' })).status).toBe(201);
    expect(modelo.agregar).toHaveBeenCalledWith(1, FECHA, 330);
  });

  test.each([
    ['vacía', {}],
    ['en blanco', { ml: '' }],
    ['negativa', { ml: -250 }],
    ['en cero', { ml: 0 }],
    ['bajo el mínimo', { ml: 49 }],
    ['sobre el máximo', { ml: 2001 }],
    ['con decimales', { ml: 250.5 }],
    ['que no es un número', { ml: 'un vaso' }],
  ])('una cantidad %s no se guarda e indica el rango permitido', async (_caso, cuerpo) => {
    const res = await conSesion(request(app).post('/api/agua')).send(cuerpo);
    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body)).toContain('Indica entre 50 y 2.000 ml');
    expect(modelo.agregar).not.toHaveBeenCalled();
  });

  test('desde Comidas suma al día anterior que se está viendo', async () => {
    modelo.agregar.mockResolvedValue([{ id: 9, ml: 250, fechaCreacion: new Date('2026-10-01T15:00:00Z') }]);
    const res = await conSesion(request(app).post('/api/agua')).send({ ml: 250, fecha: '2026-10-01' });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ fecha: '2026-10-01', totalMl: 250 });
    expect(res.body.hoy).not.toBe('2026-10-01');
    expect(modelo.agregar).toHaveBeenCalledWith(1, '2026-10-01', 250);
  });

  test('no suma agua a un día que aún no llega', async () => {
    const res = await conSesion(request(app).post('/api/agua')).send({ ml: 250, fecha: '2999-01-01' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('No puedes registrar agua en días que aún no llegan');
    expect(modelo.agregar).not.toHaveBeenCalled();
  });

  test.each(['01-10-2026', '2026-02-30', 20261001])('rechaza la fecha mal escrita %s', async (fecha) => {
    const res = await conSesion(request(app).post('/api/agua')).send({ ml: 250, fecha });
    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body)).toContain('La fecha debe tener el formato AAAA-MM-DD');
    expect(modelo.agregar).not.toHaveBeenCalled();
  });

  test('si el día ya llega al máximo, responde el aviso del modelo', async () => {
    modelo.agregar.mockRejectedValue(new ErrorHttp(400, 'Hoy puedes sumar hasta 100 ml más (el máximo es 10.000 ml al día)'));
    const res = await conSesion(request(app).post('/api/agua')).send({ ml: 250 });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Hoy puedes sumar hasta 100 ml más (el máximo es 10.000 ml al día)');
  });
});

describe('DELETE /api/agua/:id', () => {
  test('deshace una suma de hoy y responde el día actualizado', async () => {
    modelo.eliminar.mockResolvedValue([filas[0]]);
    const res = await conSesion(request(app).delete('/api/agua/5'));
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ totalMl: 250 });
    expect(modelo.eliminar).toHaveBeenCalledWith(1, FECHA, 5);
  });

  test('desde Comidas quita una suma propia del día anterior que se está viendo', async () => {
    modelo.eliminar.mockResolvedValue([]);
    const res = await conSesion(request(app).delete('/api/agua/5?fecha=2026-10-01'));
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ fecha: '2026-10-01', totalMl: 0 });
    expect(modelo.eliminar).toHaveBeenCalledWith(1, '2026-10-01', 5);
  });

  test('no quita sumas de un día que aún no llega ni con una fecha mal escrita', async () => {
    expect((await conSesion(request(app).delete('/api/agua/5?fecha=2999-01-01'))).status).toBe(400);
    expect((await conSesion(request(app).delete('/api/agua/5?fecha=01-10-2026'))).status).toBe(400);
    expect(modelo.eliminar).not.toHaveBeenCalled();
  });

  test('una suma ajena o de otro día responde 404, y un id inválido 400', async () => {
    modelo.eliminar.mockRejectedValue(new ErrorHttp(404, 'No encontramos ese registro de agua'));
    expect((await conSesion(request(app).delete('/api/agua/99'))).status).toBe(404);
    expect((await conSesion(request(app).delete('/api/agua/abc'))).status).toBe(400);
  });
});

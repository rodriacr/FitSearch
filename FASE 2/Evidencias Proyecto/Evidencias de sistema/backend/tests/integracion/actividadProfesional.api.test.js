jest.mock('../../src/services/actividadProfesional.service');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../src/app');
const servicio = require('../../src/services/actividadProfesional.service');

const token = (rol) => jwt.sign({ rol }, process.env.JWT_SECRET, { subject: '7' });
const api = (rol, ruta) => request(app).get(`/api${ruta}`).set('Authorization', `Bearer ${token(rol)}`);

beforeEach(() => jest.resetAllMocks());

test('clientes y reportes exigen sesión y rol profesional', async () => {
  expect((await request(app).get('/api/profesional/clientes')).status).toBe(401);
  for (const rol of ['usuario', 'administrador']) {
    expect((await api(rol, '/profesional/clientes')).status).toBe(403);
    expect((await api(rol, '/profesional/clientes/3')).status).toBe(403);
    expect((await api(rol, '/profesional/reportes')).status).toBe(403);
  }
  expect(servicio.listarClientes).not.toHaveBeenCalled();
});

test('lista los clientes de la cuenta autenticada', async () => {
  servicio.listarClientes.mockResolvedValue({ clientes: [{ id: 21, nombre: 'Camila Rojas' }], zonaHoraria: 'America/Santiago' });
  const res = await api('profesional', '/profesional/clientes');
  expect(res.status).toBe(200);
  expect(res.body.clientes).toHaveLength(1);
  expect(servicio.listarClientes).toHaveBeenCalledWith(7);
});

test('el historial valida el id del cliente antes de consultar', async () => {
  expect((await api('profesional', '/profesional/clientes/abc')).status).toBe(400);
  expect((await api('profesional', '/profesional/clientes/0')).status).toBe(400);
  expect(servicio.historialCliente).not.toHaveBeenCalled();
  servicio.historialCliente.mockResolvedValue({ cliente: { id: 21 }, citas: [] });
  expect((await api('profesional', '/profesional/clientes/21')).status).toBe(200);
  expect(servicio.historialCliente).toHaveBeenCalledWith(7, 21);
});

test('los reportes aceptan de 4 a 26 semanas', async () => {
  servicio.reportes.mockResolvedValue({ semanas: [] });
  expect((await api('profesional', '/profesional/reportes')).status).toBe(200);
  expect(servicio.reportes).toHaveBeenLastCalledWith(7, {});
  expect((await api('profesional', '/profesional/reportes?semanas=12')).status).toBe(200);
  expect(servicio.reportes).toHaveBeenLastCalledWith(7, { semanas: 12 });
  expect((await api('profesional', '/profesional/reportes?semanas=3')).status).toBe(400);
  expect((await api('profesional', '/profesional/reportes?semanas=muchas')).status).toBe(400);
});

test('la ruta /profesionales sigue siendo el directorio, no la actividad del profesional', async () => {
  expect((await api('profesional', '/profesionales')).status).toBe(403);
  expect(servicio.listarClientes).not.toHaveBeenCalled();
});

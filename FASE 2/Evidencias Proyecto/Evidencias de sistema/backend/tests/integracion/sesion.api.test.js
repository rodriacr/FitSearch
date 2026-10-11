jest.mock('../../src/models/sesion.model', () => ({ estadoCuenta: jest.fn() }));
jest.mock('../../src/models/administrador.model');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../src/app');
const modelo = require('../../src/models/sesion.model');
const admin = require('../../src/models/administrador.model');
const token = (versionSesion = 0) => jwt.sign({ rol: 'administrador', versionSesion }, process.env.JWT_SECRET, { subject: '1' });
beforeEach(() => { jest.resetAllMocks(); admin.listarUsuarios.mockResolvedValue({ filas: [], total: 0 }); });
test.each([null, { activo: false, versionSesion: 0 }, { activo: true, versionSesion: 1 }])('invalida una sesión eliminada, desactivada o anterior a la reactivación: %j', async (cuenta) => {
  modelo.estadoCuenta.mockResolvedValue(cuenta);
  expect((await request(app).get('/api/administrador/usuarios').set('Authorization', `Bearer ${token()}`)).status).toBe(401);
  expect(admin.listarUsuarios).not.toHaveBeenCalled();
});
test('la sesión nueva de una cuenta reactivada funciona', async () => {
  modelo.estadoCuenta.mockResolvedValue({ activo: true, versionSesion: 2 });
  expect((await request(app).get('/api/administrador/usuarios').set('Authorization', `Bearer ${token(2)}`)).status).toBe(200);
});

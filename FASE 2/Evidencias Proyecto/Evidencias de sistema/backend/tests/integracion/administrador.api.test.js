jest.mock('../../src/models/administrador.model');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../src/app');
const modelo = require('../../src/models/administrador.model');
const token = (rol = 'administrador') => jwt.sign({ rol }, process.env.JWT_SECRET, { subject: '1', expiresIn: '1h' });
const consultar = (ruta, rol) => request(app).get(ruta).set('Authorization', `Bearer ${token(rol)}`);
const persona = { id: 5, nombre: 'Ana Demo', correo: 'ana@example.test', rol: { nombre: 'profesional' }, fechaRegistro: new Date('2026-10-01T10:00:00Z'), passwordHash: 'no-exponer', googleId: 'no-exponer', informacionSalud: 'no-exponer' };
const ficha = { id: 2, especialidad: 'Nutrición', descripcion: 'Atención nutricional', comuna: 'Ñuñoa', modalidad: 'online', verificado: false, usuario: persona };
beforeEach(() => jest.resetAllMocks());

test.each(['/resumen', '/usuarios', '/profesionales', '/profesionales/2'])('protege %s sin sesión y frente a roles no administrativos', async (ruta) => {
  expect((await request(app).get(`/api/administrador${ruta}`)).status).toBe(401);
  for (const rol of ['usuario', 'profesional']) expect((await consultar(`/api/administrador${ruta}`, rol)).status).toBe(403);
  expect(modelo.resumen).not.toHaveBeenCalled();
  expect(modelo.listarUsuarios).not.toHaveBeenCalled();
  expect(modelo.detalleProfesional).not.toHaveBeenCalled();
});
test('lista usuarios con filtros y paginación sin datos de autenticación o salud', async () => {
  modelo.listarUsuarios.mockResolvedValue({ filas: [persona], total: 13 });
  const res = await consultar('/api/administrador/usuarios?q=Ana&rol=profesional&pagina=2');
  expect(res.status).toBe(200);
  expect(res.body).toMatchObject({ total: 13, pagina: 2, totalPaginas: 2, resultados: [{ id: 5, correo: 'ana@example.test', rol: 'profesional' }] });
  expect(JSON.stringify(res.body)).not.toContain('no-exponer');
  expect(modelo.listarUsuarios).toHaveBeenCalledWith({ q: 'Ana', rol: 'profesional', estadoCuenta: '', pagina: 2, limite: 12 });
});
test('consulta las fichas pendientes y el detalle sin exponer la fila de usuario', async () => {
  modelo.listarProfesionales.mockResolvedValue({ filas: [ficha], total: 1 });
  modelo.detalleProfesional.mockResolvedValue(ficha);
  expect((await consultar('/api/administrador/profesionales?estado=pendientes')).body.resultados[0]).toMatchObject({ id: 2, verificado: false, nombre: 'Ana Demo' });
  const res = await consultar('/api/administrador/profesionales/2');
  expect(res.status).toBe(200);
  expect(res.body.profesional.usuario).toBeUndefined();
  expect(JSON.stringify(res.body)).not.toContain('no-exponer');
});
test('distingue un profesional inexistente de un id inválido', async () => {
  modelo.detalleProfesional.mockResolvedValue(null);
  expect((await consultar('/api/administrador/profesionales/999999')).status).toBe(404);
  expect((await consultar('/api/administrador/profesionales/abc')).status).toBe(400);
});
test.each(['pagina=0', 'pagina=1.5', 'limite=51', 'q=a&q=b', 'estado=desconocido'])('rechaza filtros inválidos: %s', async (query) => {
  expect((await consultar(`/api/administrador/profesionales?${query}`)).status).toBe(400);
  expect(modelo.listarProfesionales).not.toHaveBeenCalled();
});
test('convierte los agregados MySQL y delimita el reporte solicitado', async () => {
  modelo.resumen.mockResolvedValue({ usuarios: 4, profesionales: 2, pendientes: 1, verificados: 1, nuevosUsuarios: 2, nuevosProfesionales: 1, registros: [{ fecha: new Date('2026-10-10T00:00:00Z'), rol: 'usuario', cantidad: 2n }] });
  const res = await consultar('/api/administrador/resumen?dias=7');
  expect(res.status).toBe(200);
  expect(res.body.registros).toEqual([{ fecha: '2026-10-10', rol: 'usuario', cantidad: 2 }]);
  const [desde, hasta] = modelo.resumen.mock.calls[0];
  expect(hasta - desde).toBe(7 * 86400000);
  expect((await consultar('/api/administrador/resumen?dias=365')).status).toBe(400);
});

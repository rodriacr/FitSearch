jest.mock('../../src/models/administrador.model');
jest.mock('../../src/models/estadisticasAdmin.model');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../src/app');
const modelo = require('../../src/models/administrador.model');
const estadisticas = require('../../src/models/estadisticasAdmin.model');
const token = (rol = 'administrador') => jwt.sign({ rol }, process.env.JWT_SECRET, { subject: '1', expiresIn: '1h' });
const consultar = (ruta, rol) => request(app).get(ruta).set('Authorization', `Bearer ${token(rol)}`);
const persona = { id: 5, nombre: 'Ana Demo', correo: 'ana@example.test', rol: { nombre: 'profesional' }, fechaRegistro: new Date('2026-10-01T10:00:00Z'), passwordHash: 'no-exponer', googleId: 'no-exponer', informacionSalud: 'no-exponer' };
const ficha = { id: 2, especialidad: 'Nutrición', descripcion: 'Atención nutricional', comuna: 'Ñuñoa', modalidad: 'online', verificado: false, usuario: persona };
beforeEach(() => jest.resetAllMocks());

test.each(['/dashboard', '/reportes', '/alertas', '/usuarios', '/profesionales', '/profesionales/2'])('protege %s sin sesión y frente a roles no administrativos', async (ruta) => {
  expect((await request(app).get(`/api/administrador${ruta}`)).status).toBe(401);
  for (const rol of ['usuario', 'profesional']) expect((await consultar(`/api/administrador${ruta}`, rol)).status).toBe(403);
  expect(estadisticas.profesionales).not.toHaveBeenCalled();
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
// Dashboard, reportes y avisos (11-11-2026): cada pantalla responde lo suyo; el detalle de los cálculos está en
// tests/unit/estadisticasAdmin.service.test.js.
function datosVacios() {
  estadisticas.cuentas.mockResolvedValue([]);
  estadisticas.reservas.mockResolvedValue([]);
  estadisticas.resenas.mockResolvedValue([]);
  estadisticas.preguntasAsistente.mockResolvedValue([]);
  estadisticas.profesionales.mockResolvedValue([]);
  estadisticas.ultimasCuentas.mockResolvedValue([]);
  estadisticas.plataforma.mockResolvedValue({ usuariosActivos: 0, usuariosInactivos: 0, profesionalesActivos: 0, establecimientos: {} });
  estadisticas.personasPorFuncion.mockResolvedValue({ asistente: 0, comidas: 0, agua: 0, reservas: 0, favoritos: 0, planes: 0 });
}
test('el dashboard y los reportes responden lo suyo; los reportes solo aceptan 30, 90 o 365 días', async () => {
  datosVacios();
  const dashboard = await consultar('/api/administrador/dashboard');
  expect(dashboard.status).toBe(200);
  expect(Object.keys(dashboard.body)).toEqual(['hoy', 'cola', 'cifras', 'actividad', 'ultimasCuentas', 'plataforma']);
  expect(dashboard.body.actividad).toHaveLength(14);
  const reportes = await consultar('/api/administrador/reportes?dias=365');
  expect(reportes.status).toBe(200);
  expect(reportes.body.periodo).toMatchObject({ dias: 365, agrupacion: 'mes' });
  expect(Object.keys(reportes.body)).toEqual(['periodo', 'anterior', 'crecimiento', 'oferta', 'demanda', 'calidad', 'uso']);
  const malo = await consultar('/api/administrador/reportes?dias=7');
  expect(malo.status).toBe(400);
  expect(malo.body.detalles.dias).toBe('Elige 30, 90 o 365 días');
  estadisticas.verificacionesPendientes.mockResolvedValue(3);
  expect((await consultar('/api/administrador/alertas')).body).toEqual({ verificacionesPendientes: 3 });
});
test('verificaciones es una cola por antigüedad de la solicitud; profesionales, un directorio con calificación y reservas', async () => {
  const conSolicitud = (id, fecha, estado = 'pendiente') => ({
    ...ficha, id, estadoVerificacion: estado, historialVerificacion: fecha ? [{ accion: 'documento', fecha: '2026-01-01T00:00:00Z' }, { accion: 'solicitud', fecha }] : [], _count: { documentos: id },
  });
  modelo.listarProfesionales.mockResolvedValue({ filas: [conSolicitud(1, '2026-11-01T12:00:00Z'), conSolicitud(2, null), conSolicitud(3, '2026-10-20T12:00:00Z')], total: 3 });
  const cola = await consultar('/api/administrador/profesionales?estado=pendientes&vista=cola&limite=2');
  expect(cola.status).toBe(200);
  expect(modelo.listarProfesionales).toHaveBeenCalledWith(expect.objectContaining({ vista: 'cola', estado: 'pendientes' }));
  expect(cola.body).toMatchObject({ total: 3, totalPaginas: 2 });
  expect(cola.body.resultados.map((fila) => [fila.id, fila.solicitadoEl, fila.documentos])).toEqual([[3, '2026-10-20T12:00:00Z', 3], [1, '2026-11-01T12:00:00Z', 1]]);
  expect(cola.body.resultados[0].diasEsperando).toBeGreaterThan(0);
  // La que no tiene fecha de solicitud queda al final.
  expect((await consultar('/api/administrador/profesionales?estado=pendientes&vista=cola&limite=2&pagina=2')).body.resultados[0].id).toBe(2);

  modelo.listarProfesionales.mockResolvedValue({ filas: [{ ...ficha, calificacion: { promedio: 4.666, total: 3 }, reservas: 5 }], total: 1 });
  const directorio = await consultar('/api/administrador/profesionales');
  expect(modelo.listarProfesionales).toHaveBeenLastCalledWith(expect.objectContaining({ vista: 'directorio' }));
  expect(directorio.body.resultados[0]).toMatchObject({ calificacion: { promedio: 4.7, total: 3 }, reservas: 5 });
  expect((await consultar('/api/administrador/profesionales?vista=tabla')).status).toBe(400);
});

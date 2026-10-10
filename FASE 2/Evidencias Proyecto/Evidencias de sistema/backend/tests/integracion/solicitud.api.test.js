jest.mock('../../src/models/verificacion.model');
jest.mock('../../src/services/documento.service');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../src/app');
const modelo = require('../../src/models/verificacion.model');
const documentos = require('../../src/services/documento.service');
const token = (rol) => jwt.sign({ rol }, process.env.JWT_SECRET, { subject: '7' });
const enviar = (rol, cuerpo) => request(app).post('/api/verificaciones/mi-solicitud').set('Authorization', `Bearer ${token(rol)}`).send(cuerpo);
beforeEach(() => jest.resetAllMocks());
test('solo un profesional envía su propia solicitud, con RUT válido normalizado', async () => {
  modelo.enviarSolicitud.mockResolvedValue({ estado: 'pendiente' });
  expect((await enviar('usuario', { rut: '12.345.678-5' })).status).toBe(403);
  expect((await enviar('profesional', { rut: '12.345.678-5' })).status).toBe(200);
  expect(modelo.enviarSolicitud).toHaveBeenCalledWith(7, { rut: '12345678-5', telefono: null });
  expect((await enviar('profesional', { rut: '12345678-1' })).status).toBe(400);
});
test('adjunta archivo binario y devuelve metadatos sin rutas internas', async () => {
  documentos.guardar.mockResolvedValue({ id: 3, tipo: 'titulo', nombre: 'titulo.pdf' });
  const res = await request(app).post('/api/verificaciones/documentos?tipo=titulo&nombre=titulo.pdf').set('Authorization', `Bearer ${token('profesional')}`).set('Content-Type', 'application/pdf').send(Buffer.from('%PDF-1.7 prueba'));
  expect(res.status).toBe(201);
  expect(documentos.guardar).toHaveBeenCalledWith(7, 'titulo', 'titulo.pdf', expect.any(Buffer));
  expect(res.body.documento.clave).toBeUndefined();
});
test('la decisión administrativa exige rol, revisión y motivo para rechazar', async () => {
  const decidir = (rol, cuerpo) => request(app).post('/api/administrador/profesionales/2/decision').set('Authorization', `Bearer ${token(rol)}`).send(cuerpo);
  expect((await decidir('profesional', { accion: 'aprobar', revision: 3 })).status).toBe(403);
  expect((await decidir('administrador', { accion: 'rechazar', revision: 3, motivo: '' })).status).toBe(400);
  modelo.decidir.mockResolvedValue({ id: 2, verificado: false });
  expect((await decidir('administrador', { accion: 'rechazar', revision: 3, motivo: 'Documento ilegible' })).status).toBe(200);
  expect(modelo.decidir).toHaveBeenCalledWith(2, { accion: 'rechazar', revision: 3, motivo: 'Documento ilegible', administradorId: 7 });
});

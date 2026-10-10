jest.mock('../../src/models/prisma', () => ({ $transaction: jest.fn(), profesional: { findUnique: jest.fn(), updateMany: jest.fn() }, documentoProfesional: { count: jest.fn(), create: jest.fn() } }));
const prisma = require('../../src/models/prisma');
const modelo = require('../../src/models/verificacion.model');
const ficha = () => ({ id: 2, usuarioId: 7, usuario: { activo: true }, verificado: false, rut: '12345678-5', revisionVerificacion: 3, documentos: [{ tipo: 'identidad' }, { tipo: 'titulo' }], historialVerificacion: [] });
const documentosFechados = (fecha) => [{ id: 1, tipo: 'identidad', fechaCreacion: new Date(fecha) }, { id: 2, tipo: 'titulo', fechaCreacion: new Date(fecha) }];
beforeEach(() => { jest.resetAllMocks(); prisma.$transaction.mockImplementation((f) => f(prisma)); prisma.profesional.findUnique.mockResolvedValue(ficha()); prisma.profesional.updateMany.mockResolvedValue({ count: 1 }); });
test('aprueba con documentos y registra el administrador sin devolver documentos privados', async () => {
  expect(await modelo.decidir(2, { accion: 'aprobar', administradorId: 1, revision: 3 })).toEqual({ id: 2, verificado: true });
  expect(prisma.profesional.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 2, revisionVerificacion: 3 }, data: expect.objectContaining({ verificado: true, estadoVerificacion: 'verificado', historialVerificacion: [expect.objectContaining({ accion: 'aprobar', administradorId: 1 })] }) }));
});
test.each([{ documentos: [] }, { rut: null }, { usuario: { activo: false } }])('no verifica si faltan requisitos: %j', async (cambios) => {
  prisma.profesional.findUnique.mockResolvedValue({ ...ficha(), ...cambios });
  await expect(modelo.decidir(2, { accion: 'aprobar' })).rejects.toMatchObject({ estado: 409 });
  expect(prisma.profesional.updateMany).not.toHaveBeenCalled();
});
test('detecta cambios desde que el administrador abrió la ficha y durante la transacción', async () => {
  await expect(modelo.decidir(2, { accion: 'aprobar', revision: 2 })).rejects.toMatchObject({ estado: 409 });
  prisma.profesional.updateMany.mockResolvedValue({ count: 0 });
  await expect(modelo.decidir(2, { accion: 'aprobar', revision: 3 })).rejects.toMatchObject({ estado: 409 });
});
test('rechaza con motivo, conserva el historial y permite una nueva solicitud', async () => {
  await modelo.decidir(2, { accion: 'rechazar', motivo: 'El título no es legible', administradorId: 1 });
  expect(prisma.profesional.updateMany.mock.calls[0][0].data).toMatchObject({ verificado: false, estadoVerificacion: 'rechazado', motivoRechazo: 'El título no es legible' });
  await modelo.enviarSolicitud(7, { rut: '12345678-5', telefono: null });
  expect(prisma.profesional.updateMany.mock.calls[1][0].data).toMatchObject({ estadoVerificacion: 'pendiente', motivoRechazo: null });
});
test('no acepta una decisión arbitraria ni un rechazo sin motivo', async () => {
  await expect(modelo.decidir(2, { accion: 'otra' })).rejects.toMatchObject({ estado: 400 });
  await expect(modelo.decidir(2, { accion: 'rechazar', motivo: 'no' })).rejects.toMatchObject({ estado: 400 });
});
test('devuelve 404 para una ficha inexistente y no duplica una aprobación', async () => {
  prisma.profesional.findUnique.mockResolvedValue(null);
  await expect(modelo.decidir(99, { accion: 'aprobar' })).rejects.toMatchObject({ estado: 404 });
  prisma.profesional.findUnique.mockResolvedValue({ ...ficha(), verificado: true });
  expect(await modelo.decidir(2, { accion: 'aprobar' })).toEqual({ id: 2, verificado: true });
  expect(prisma.profesional.updateMany).not.toHaveBeenCalled();
});

test.each(['rechazar', 'revocar'])('después de %s los documentos anteriores no aparecen ni permiten reenviar o aprobar', async (accion) => {
  const datos = { ...ficha(), documentos: documentosFechados('2026-10-10T10:00:00Z'), historialVerificacion: [{ accion, fecha: '2026-10-10T11:00:00Z' }] };
  prisma.profesional.findUnique.mockResolvedValue(datos);
  expect(modelo.documentosActuales(datos)).toEqual([]);
  await expect(modelo.enviarSolicitud(7, { rut: '12345678-5' })).rejects.toMatchObject({ estado: 409 });
  await expect(modelo.decidir(2, { accion: 'aprobar' })).rejects.toMatchObject({ estado: 409 });
  expect(prisma.profesional.updateMany).not.toHaveBeenCalled();
});

test('las subidas nuevas persisten al recargar y permiten reenviar sin recuperar versiones anteriores', async () => {
  const nuevos = documentosFechados('2026-10-10T12:00:00Z').map((d) => ({ ...d, id: d.id + 2 }));
  const datos = { ...ficha(), documentos: [...documentosFechados('2026-10-10T10:00:00Z'), ...nuevos], historialVerificacion: [{ accion: 'rechazar', fecha: '2026-10-10T11:00:00Z' }] };
  prisma.profesional.findUnique.mockResolvedValue(datos);
  const recargada = await modelo.buscarPorUsuario(7);
  expect(modelo.documentosActuales(recargada).map((d) => d.id)).toEqual([4, 3]);
  expect(await modelo.enviarSolicitud(7, { rut: '12345678-5', telefono: null })).toEqual({ estado: 'pendiente' });
  expect(modelo.documentosActuales({ ...recargada, historialVerificacion: [...recargada.historialVerificacion, { accion: 'solicitud', fecha: '2026-10-10T13:00:00Z' }] })).toEqual(modelo.documentosActuales(recargada));
});

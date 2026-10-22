// Conversaciones del asistente IA (FS-HU-07): toda consulta filtra por el dueño. Cliente de Prisma simulado.
jest.mock('../../src/models/prisma', () => ({
  conversacion: { findMany: jest.fn(), findFirst: jest.fn(), count: jest.fn(), create: jest.fn(), update: jest.fn(), updateMany: jest.fn(), deleteMany: jest.fn() },
  mensaje: { findMany: jest.fn(), count: jest.fn(), create: jest.fn() },
  usoAsistente: { findUnique: jest.fn(), updateMany: jest.fn(), upsert: jest.fn() },
  $transaction: jest.fn(),
}));
const prisma = require('../../src/models/prisma');
const modelo = require('../../src/models/asistente.model');

beforeEach(() => jest.resetAllMocks());

test('el historial, la apertura, fijar y borrar solo alcanzan conversaciones del usuario', async () => {
  prisma.conversacion.findMany.mockResolvedValue([]);
  await modelo.listarConversaciones(7, 50);
  expect(prisma.conversacion.findMany).toHaveBeenCalledWith(expect.objectContaining({
    where: { usuarioId: 7 }, take: 50, orderBy: [{ fijada: 'desc' }, { fechaActualizacion: 'desc' }, { id: 'desc' }],
  }));
  await modelo.obtenerConversacion(5, 7);
  expect(prisma.conversacion.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 5, usuarioId: 7 } }));
  await modelo.fijar(5, 7, true);
  expect(prisma.conversacion.updateMany).toHaveBeenCalledWith({ where: { id: 5, usuarioId: 7 }, data: { fijada: true } });
  await modelo.eliminar(5, 7);
  expect(prisma.conversacion.deleteMany).toHaveBeenCalledWith({ where: { id: 5, usuarioId: 7 } });
});

test('el uso del día solo cuenta si la fila es de hoy', async () => {
  prisma.usoAsistente.findUnique.mockResolvedValue({ usuarioId: 7, fecha: new Date('2026-10-21T00:00:00Z'), mensajes: 4 });
  expect(await modelo.usoDelDia(7, '2026-10-21')).toBe(4);
  expect(await modelo.usoDelDia(7, '2026-10-22')).toBe(0);
  prisma.usoAsistente.findUnique.mockResolvedValue(null);
  expect(await modelo.usoDelDia(7, '2026-10-21')).toBe(0);
});

test('registrar uso suma uno el mismo día y parte de nuevo en 1 al cambiar de día', async () => {
  prisma.usoAsistente.updateMany.mockResolvedValueOnce({ count: 1 });
  await modelo.registrarUso(7, '2026-10-21');
  expect(prisma.usoAsistente.updateMany).toHaveBeenCalledWith({ where: { usuarioId: 7, fecha: new Date('2026-10-21T00:00:00Z') }, data: { mensajes: { increment: 1 } } });
  expect(prisma.usoAsistente.upsert).not.toHaveBeenCalled();

  prisma.usoAsistente.updateMany.mockResolvedValueOnce({ count: 0 });
  await modelo.registrarUso(7, '2026-10-22');
  const dia = new Date('2026-10-22T00:00:00Z');
  expect(prisma.usoAsistente.upsert).toHaveBeenCalledWith({
    where: { usuarioId: 7 }, create: { usuarioId: 7, fecha: dia, mensajes: 1 }, update: { fecha: dia, mensajes: 1 },
  });
});

test('los últimos mensajes llegan en orden cronológico', async () => {
  prisma.mensaje.findMany.mockResolvedValue([{ id: 3 }, { id: 2 }, { id: 1 }]);
  expect(await modelo.ultimosMensajes(5, 9)).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }]);
  expect(prisma.mensaje.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { conversacionId: 5 }, take: 9 }));
});

test('agregar mensajes los guarda en una transacción y actualiza la fecha de la conversación', async () => {
  const fecha = new Date('2026-10-21T15:00:00Z');
  prisma.mensaje.create.mockImplementation(({ data }) => ({ creado: data.remitente }));
  prisma.conversacion.update.mockImplementation((args) => ({ actualizada: args }));
  prisma.$transaction.mockImplementation(async (operaciones) => operaciones);
  const guardados = await modelo.agregarMensajes(5, [
    { remitente: 'usuario', contenido: 'Hola', fecha },
    { remitente: 'asistente', contenido: '¡Hola!', fecha },
  ]);
  expect(guardados).toEqual([{ creado: 'usuario' }, { creado: 'asistente' }]);
  expect(prisma.conversacion.update).toHaveBeenCalledWith({ where: { id: 5 }, data: { fechaActualizacion: fecha } });
});

// Conversaciones del asistente IA (FS-HU-07): toda consulta filtra por el dueño. Cliente de Prisma simulado.
jest.mock('../../src/models/prisma', () => ({
  conversacion: { findMany: jest.fn(), findFirst: jest.fn(), count: jest.fn(), create: jest.fn(), update: jest.fn(), updateMany: jest.fn(), deleteMany: jest.fn() },
  mensaje: { findMany: jest.fn(), count: jest.fn(), create: jest.fn() },
  usoAsistente: { findUnique: jest.fn(), updateMany: jest.fn(), create: jest.fn() },
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

describe('reservar uso', () => {
  const dia = new Date('2026-10-21T00:00:00Z');
  const sumar = { where: { usuarioId: 7, fecha: dia, mensajes: { lt: 30 } }, data: { mensajes: { increment: 1 } } };

  test('el mismo día suma uno solo si quedaba cupo, con la condición en la misma sentencia', async () => {
    prisma.usoAsistente.updateMany.mockResolvedValueOnce({ count: 1 });
    expect(await modelo.reservarUso(7, '2026-10-21', 30)).toBe(true);
    expect(prisma.usoAsistente.updateMany).toHaveBeenCalledTimes(1);
    expect(prisma.usoAsistente.updateMany).toHaveBeenCalledWith(sumar);
  });

  test('si la fila es de otro día, el contador parte de nuevo en 1', async () => {
    prisma.usoAsistente.updateMany.mockResolvedValueOnce({ count: 0 }).mockResolvedValueOnce({ count: 1 });
    expect(await modelo.reservarUso(7, '2026-10-21', 30)).toBe(true);
    expect(prisma.usoAsistente.updateMany).toHaveBeenLastCalledWith({ where: { usuarioId: 7, fecha: { not: dia } }, data: { fecha: dia, mensajes: 1 } });
    expect(prisma.usoAsistente.create).not.toHaveBeenCalled();
  });

  test('el primer mensaje de la persona crea la fila', async () => {
    prisma.usoAsistente.updateMany.mockResolvedValue({ count: 0 });
    prisma.usoAsistente.create.mockResolvedValue({});
    expect(await modelo.reservarUso(7, '2026-10-21', 30)).toBe(true);
    expect(prisma.usoAsistente.create).toHaveBeenCalledWith({ data: { usuarioId: 7, fecha: dia, mensajes: 1 } });
  });

  test('sin cupo responde false; si otra solicitud creó la fila primero, suma sobre ella sin pasar el límite', async () => {
    const duplicada = Object.assign(new Error('Unique constraint failed'), { code: 'P2002' });
    prisma.usoAsistente.updateMany.mockResolvedValue({ count: 0 });
    prisma.usoAsistente.create.mockRejectedValue(duplicada);
    expect(await modelo.reservarUso(7, '2026-10-21', 30)).toBe(false);
    expect(prisma.usoAsistente.updateMany).toHaveBeenLastCalledWith(sumar);

    prisma.usoAsistente.updateMany.mockResolvedValueOnce({ count: 0 }).mockResolvedValueOnce({ count: 0 }).mockResolvedValueOnce({ count: 1 });
    expect(await modelo.reservarUso(7, '2026-10-21', 30)).toBe(true);
  });

  test('otro error al crear la fila no se oculta', async () => {
    prisma.usoAsistente.updateMany.mockResolvedValue({ count: 0 });
    prisma.usoAsistente.create.mockRejectedValue(new Error('sin conexión'));
    await expect(modelo.reservarUso(7, '2026-10-21', 30)).rejects.toThrow('sin conexión');
  });

  test('liberar uso resta uno solo en la fila de ese día', async () => {
    prisma.usoAsistente.updateMany.mockResolvedValue({ count: 1 });
    await modelo.liberarUso(7, '2026-10-21');
    expect(prisma.usoAsistente.updateMany).toHaveBeenCalledWith({ where: { usuarioId: 7, fecha: dia, mensajes: { gt: 0 } }, data: { mensajes: { decrement: 1 } } });
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

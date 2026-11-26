// Logros y medallas (25-11-2026) en el modelo, con el cliente de Prisma simulado.
jest.mock('../../src/models/prisma', () => ({
  registroComida: { groupBy: jest.fn(), findMany: jest.fn() },
  registroAgua: { groupBy: jest.fn() },
  reserva: { findMany: jest.fn() },
  resena: { count: jest.fn() }, conversacion: { count: jest.fn() }, favorito: { count: jest.fn() }, planComida: { count: jest.fn() },
  medallaUsuario: { findMany: jest.fn(), createMany: jest.fn(), updateMany: jest.fn() },
}));
const prisma = require('../../src/models/prisma');
const modelo = require('../../src/models/logro.model');

beforeEach(() => jest.clearAllMocks());

test('guardar agrega solo las medallas que faltan, sin tocar las que ya estaban', async () => {
  await modelo.guardar(7, [{ clave: 'hidratacion', nivel: 'bronce', periodo: '' }]);
  expect(prisma.medallaUsuario.createMany).toHaveBeenCalledWith({
    data: [{ usuarioId: 7, clave: 'hidratacion', nivel: 'bronce', periodo: '' }], skipDuplicates: true,
  });
});

test('marcar vistas solo cambia las medallas no vistas de la cuenta', async () => {
  await modelo.marcarVistas(7);
  expect(prisma.medallaUsuario.updateMany).toHaveBeenCalledWith({ where: { usuarioId: 7, vista: false }, data: { vista: true } });
});

test('alimentos distintos cuenta los del catálogo, sin los escritos a mano', async () => {
  prisma.registroComida.groupBy.mockResolvedValue([{ alimentoId: 1 }, { alimentoId: 4 }]);
  expect(await modelo.alimentosDistintos(7)).toBe(2);
  expect(prisma.registroComida.groupBy).toHaveBeenCalledWith({ by: ['alimentoId'], where: { usuarioId: 7, alimentoId: { not: null } } });
});

test('los conteos y las citas se filtran por la cuenta', async () => {
  prisma.resena.count.mockResolvedValue(1);
  prisma.conversacion.count.mockResolvedValue(2);
  prisma.favorito.count.mockResolvedValue(0);
  prisma.planComida.count.mockResolvedValue(3);
  expect(await modelo.conteos(7)).toEqual({ resenas: 1, conversaciones: 2, favoritos: 0, planesPropios: 3 });
  expect(prisma.planComida.count).toHaveBeenCalledWith({ where: { usuarioId: 7, origen: 'propio' } });
  await modelo.citasConfirmadas(7);
  expect(prisma.reserva.findMany).toHaveBeenCalledWith({ where: { usuarioId: 7, estado: 'confirmada' }, select: { disponibilidad: { select: { fecha: true } } } });
});

test('las medallas ganadas van de la más reciente a la más antigua', async () => {
  await modelo.ganadas(7);
  expect(prisma.medallaUsuario.findMany).toHaveBeenCalledWith({ where: { usuarioId: 7 }, orderBy: [{ fechaObtenida: 'desc' }, { id: 'desc' }] });
});

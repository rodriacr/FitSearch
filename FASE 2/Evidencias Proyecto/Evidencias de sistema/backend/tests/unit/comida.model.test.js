// Gestor de alimentación (FS-HU-09 y FS-HU-10): las consultas de registros filtran por el dueño. Cliente de Prisma simulado.
jest.mock('../../src/models/prisma', () => ({
  alimento: { findMany: jest.fn(), findUnique: jest.fn() },
  registroComida: { findMany: jest.fn(), groupBy: jest.fn(), create: jest.fn(), findFirst: jest.fn(), update: jest.fn(), deleteMany: jest.fn() },
}));
const prisma = require('../../src/models/prisma');
const modelo = require('../../src/models/comida.model');
const { fechaEnChile, horaEnChile, sumarDias, lunesDeLaSemana } = require('../../src/utils/fechaChile');

beforeEach(() => jest.resetAllMocks());

test('cada palabra buscada debe estar en el nombre o en los sinónimos', async () => {
  prisma.alimento.findMany.mockResolvedValue([]);
  await modelo.buscarAlimentos(['pechuga', 'pollo'], 12);
  expect(prisma.alimento.findMany).toHaveBeenCalledWith(expect.objectContaining({
    where: { AND: [
      { OR: [{ nombre: { contains: 'pechuga' } }, { sinonimos: { contains: 'pechuga' } }] },
      { OR: [{ nombre: { contains: 'pollo' } }, { sinonimos: { contains: 'pollo' } }] },
    ] },
    take: 12,
  }));
});

test('los registros del día, el total por día, editar y borrar alcanzan solo los del usuario', async () => {
  const dia = new Date('2026-10-26T00:00:00Z');
  await modelo.delDia(7, '2026-10-26');
  expect(prisma.registroComida.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { usuarioId: 7, fecha: dia } }));
  await modelo.caloriasPorDia(7, '2026-10-26', '2026-11-01');
  expect(prisma.registroComida.groupBy).toHaveBeenCalledWith({
    by: ['fecha'], where: { usuarioId: 7, fecha: { gte: dia, lte: new Date('2026-11-01T00:00:00Z') } }, _sum: { calorias: true },
  });
  await modelo.obtener(3, 7);
  expect(prisma.registroComida.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 3, usuarioId: 7 } }));
  await modelo.eliminar(3, 7);
  expect(prisma.registroComida.deleteMany).toHaveBeenCalledWith({ where: { id: 3, usuarioId: 7 } });
  await modelo.crear({ usuarioId: 7, fecha: '2026-10-26', momento: 'cena' });
  expect(prisma.registroComida.create).toHaveBeenCalledWith(expect.objectContaining({ data: { usuarioId: 7, fecha: dia, momento: 'cena' } }));
});

test('las fechas se calculan en Chile y la semana empieza el lunes', () => {
  // 27-10-2026 a las 01:30 UTC sigue siendo el 26-10 a las 22:30 en Santiago.
  expect(fechaEnChile(new Date('2026-10-27T01:30:00Z'))).toBe('2026-10-26');
  expect(horaEnChile(new Date('2026-10-27T01:30:00Z'))).toBe('22:30');
  expect(sumarDias('2026-10-31', 1)).toBe('2026-11-01');
  expect(sumarDias('2026-03-01', -1)).toBe('2026-02-28');
  expect(lunesDeLaSemana('2026-10-26')).toBe('2026-10-26');
  expect(lunesDeLaSemana('2026-11-01')).toBe('2026-10-26');
  expect(lunesDeLaSemana('2026-10-29')).toBe('2026-10-26');
});

// Catálogo de especialidades (FS-HU-30). Las demás pruebas usan el catálogo de tests/setup.js; aquí va el modelo real
// con el cliente de Prisma simulado.
jest.unmock('../../src/models/especialidad.model');
jest.mock('../../src/models/prisma', () => ({ especialidad: { findMany: jest.fn(), findFirst: jest.fn() } }));
const prisma = require('../../src/models/prisma');
const modelo = require('../../src/models/especialidad.model');

beforeEach(() => jest.resetAllMocks());

test('entrega solo los nombres de las especialidades activas, en orden alfabético', async () => {
  prisma.especialidad.findMany.mockResolvedValue([{ nombre: 'Kinesiología' }, { nombre: 'Nutrición' }]);
  expect(await modelo.nombresActivos()).toEqual(['Kinesiología', 'Nutrición']);
  expect(prisma.especialidad.findMany).toHaveBeenCalledWith({ where: { activa: true }, orderBy: { nombre: 'asc' }, select: { nombre: true } });
});

test('devuelve el nombre del catálogo de una especialidad activa, o null', async () => {
  prisma.especialidad.findFirst.mockResolvedValueOnce({ nombre: 'Nutrición' }).mockResolvedValueOnce(null);
  expect(await modelo.activaPorNombre('nutricion')).toBe('Nutrición');
  expect(prisma.especialidad.findFirst).toHaveBeenCalledWith({ where: { nombre: 'nutricion', activa: true }, select: { nombre: true } });
  expect(await modelo.activaPorNombre('Astrología')).toBeNull();
});

// Ficha propia del profesional (FS-HU-04) en el modelo, con el cliente de Prisma simulado.
jest.mock('../../src/models/prisma', () => ({ $transaction: jest.fn(), profesional: { create: jest.fn(), updateMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() } }));
jest.mock('../../src/models/verificacion.model', () => ({ decidir: jest.fn() }));
const prisma = require('../../src/models/prisma');
const { guardarFicha, obtenerPorUsuario, verificarPerfil } = require('../../src/models/profesional.model');

const datos = { especialidad: 'Nutrición', descripcion: null, comuna: 'Providencia', modalidad: 'presencial', ubicacionLat: -33.43, ubicacionLng: -70.65 };
beforeEach(() => { jest.clearAllMocks(); prisma.$transaction.mockImplementation((f) => f(prisma)); prisma.profesional.findUnique.mockResolvedValue(null); });

test('guardar la ficha la crea si la cuenta profesional todavía no tiene una', async () => {
  await guardarFicha(7, datos);
  const [{ data, select }] = prisma.profesional.create.mock.calls[0];
  expect(data).toEqual({ usuarioId: 7, ...datos });
  // La ficha propia muestra el estado, pero no permite modificarlo.
  expect(select.verificado).toBe(true);
  expect(data).not.toHaveProperty('verificado');
});
test('cambiar la especialidad retira la insignia y protege frente a una edición concurrente', async () => {
  prisma.profesional.findUnique.mockResolvedValue({ id: 2, especialidad: 'Kinesiología', verificado: true, revisionVerificacion: 3 });
  prisma.profesional.updateMany.mockResolvedValue({ count: 1 });
  await guardarFicha(7, datos);
  expect(prisma.profesional.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 2, revisionVerificacion: 3 }, data: expect.objectContaining({ verificado: false, estadoVerificacion: 'pendiente' }) }));
  prisma.profesional.updateMany.mockResolvedValue({ count: 0 });
  await expect(guardarFicha(7, datos)).rejects.toMatchObject({ estado: 409 });
});

test('la ficha propia se busca por la cuenta y devuelve solo sus campos', async () => {
  await obtenerPorUsuario(7);
  const [{ where, select }] = prisma.profesional.findUnique.mock.calls[0];
  expect(where).toEqual({ usuarioId: 7 });
  expect(Object.keys(select).sort()).toEqual(['comuna', 'descripcion', 'especialidad', 'id', 'modalidad', 'ubicacionLat', 'ubicacionLng', 'verificado']);
});

test('la ruta anterior aplica las mismas reglas de documentos e historial que el panel', async () => {
  await verificarPerfil(5, 7);
  expect(require('../../src/models/verificacion.model').decidir).toHaveBeenCalledWith(5, { accion: 'aprobar', administradorId: 7 });
});

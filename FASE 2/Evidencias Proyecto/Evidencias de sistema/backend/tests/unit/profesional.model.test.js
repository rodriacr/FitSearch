// Ficha propia del profesional (FS-HU-04) en el modelo, con el cliente de Prisma simulado.
jest.mock('../../src/models/prisma', () => ({ profesional: { upsert: jest.fn(), findUnique: jest.fn(), update: jest.fn() } }));
const prisma = require('../../src/models/prisma');
const { guardarFicha, obtenerPorUsuario, verificarPerfil } = require('../../src/models/profesional.model');

const datos = { especialidad: 'Nutrición', descripcion: null, comuna: 'Providencia', modalidad: 'presencial', ubicacionLat: -33.43, ubicacionLng: -70.65 };

test('guardar la ficha la crea si la cuenta profesional todavía no tiene una, o la actualiza si ya existe', async () => {
  await guardarFicha(7, datos);
  const [{ where, create, update, select }] = prisma.profesional.upsert.mock.calls[0];
  expect(where).toEqual({ usuarioId: 7 });
  expect(create).toEqual({ usuarioId: 7, ...datos });
  expect(update).toEqual(datos);
  // La ficha propia muestra el estado, pero no permite modificarlo.
  expect(select.verificado).toBe(true);
  expect(update).not.toHaveProperty('verificado');
});

test('la ficha propia se busca por la cuenta y devuelve solo sus campos', async () => {
  await obtenerPorUsuario(7);
  const [{ where, select }] = prisma.profesional.findUnique.mock.calls[0];
  expect(where).toEqual({ usuarioId: 7 });
  expect(Object.keys(select).sort()).toEqual(['comuna', 'descripcion', 'especialidad', 'id', 'modalidad', 'ubicacionLat', 'ubicacionLng', 'verificado']);
});

test('verificar actualiza solamente el estado y devuelve los campos públicos de la ficha', async () => {
  await verificarPerfil(5);
  expect(prisma.profesional.update).toHaveBeenCalledWith({
    where: { id: 5 }, data: { verificado: true },
    select: expect.objectContaining({ id: true, verificado: true }),
  });
});

// Ficha propia del profesional (FS-HU-04) en el modelo, con el cliente de Prisma simulado.
jest.mock('../../src/models/prisma', () => ({ profesional: { upsert: jest.fn(), findUnique: jest.fn() } }));
const prisma = require('../../src/models/prisma');
const { guardarFicha, obtenerPorUsuario } = require('../../src/models/profesional.model');

const datos = { especialidad: 'Nutrición', descripcion: null, comuna: 'Providencia', modalidad: 'presencial', ubicacionLat: -33.43, ubicacionLng: -70.65 };

test('guardar la ficha la crea si la cuenta profesional todavía no tiene una, o la actualiza si ya existe', async () => {
  await guardarFicha(7, datos);
  const [{ where, create, update, select }] = prisma.profesional.upsert.mock.calls[0];
  expect(where).toEqual({ usuarioId: 7 });
  expect(create).toEqual({ usuarioId: 7, ...datos });
  expect(update).toEqual(datos);
  // Nunca se devuelve ni se cambia la verificación desde la ficha propia.
  expect(select).not.toHaveProperty('verificado');
  expect(update).not.toHaveProperty('verificado');
});

test('la ficha propia se busca por la cuenta y devuelve solo sus campos', async () => {
  await obtenerPorUsuario(7);
  const [{ where, select }] = prisma.profesional.findUnique.mock.calls[0];
  expect(where).toEqual({ usuarioId: 7 });
  expect(Object.keys(select).sort()).toEqual(['comuna', 'descripcion', 'especialidad', 'id', 'modalidad', 'ubicacionLat', 'ubicacionLng']);
});

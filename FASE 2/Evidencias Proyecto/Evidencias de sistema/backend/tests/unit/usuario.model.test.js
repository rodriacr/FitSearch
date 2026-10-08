// "Elegir perfil" (DAS, D25): el tipo de cuenta se confirma una sola vez. Cliente de Prisma simulado.
jest.mock('../../src/models/prisma', () => ({
  rol: { findUniqueOrThrow: jest.fn() },
  usuario: { updateMany: jest.fn(), findUnique: jest.fn() },
}));
const prisma = require('../../src/models/prisma');
const { confirmarRol } = require('../../src/models/usuario.model');

beforeEach(() => {
  jest.resetAllMocks();
  prisma.rol.findUniqueOrThrow.mockResolvedValue({ id: 2, nombre: 'profesional' });
});

test('confirma el rol solo si la cuenta todavía no lo había elegido', async () => {
  prisma.usuario.updateMany.mockResolvedValue({ count: 1 });
  prisma.usuario.findUnique.mockResolvedValue({ id: 7, rolConfirmado: true, rol: { nombre: 'profesional' } });

  const usuario = await confirmarRol(7, 'profesional');

  expect(prisma.usuario.updateMany).toHaveBeenCalledWith({ where: { id: 7, rolConfirmado: false }, data: { rolId: 2, rolConfirmado: true } });
  expect(usuario.rol.nombre).toBe('profesional');
});

test('si ya lo había elegido no cambia nada y devuelve null', async () => {
  prisma.usuario.updateMany.mockResolvedValue({ count: 0 });

  expect(await confirmarRol(7, 'profesional')).toBeNull();
  expect(prisma.usuario.findUnique).not.toHaveBeenCalled();
});

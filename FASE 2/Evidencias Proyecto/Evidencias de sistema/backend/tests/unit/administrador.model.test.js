jest.mock('../../src/models/prisma', () => ({ $transaction: jest.fn(), usuario: { findUnique: jest.fn(), update: jest.fn() } }));
const prisma = require('../../src/models/prisma');
const { cambiarEstadoUsuario } = require('../../src/models/administrador.model');
beforeEach(() => { jest.resetAllMocks(); prisma.$transaction.mockImplementation((f) => f(prisma)); });
test('desactivar y reactivar incrementa la versión para invalidar las sesiones previas', async () => {
  prisma.usuario.findUnique.mockResolvedValue({ activo: true, rol: { nombre: 'profesional' } });
  expect(await cambiarEstadoUsuario(7, false)).toEqual({ id: 7, activo: false });
  expect(prisma.usuario.update).toHaveBeenCalledWith({ where: { id: 7 }, data: { activo: false, versionSesion: { increment: 1 } } });
  prisma.usuario.findUnique.mockResolvedValue({ activo: false, rol: { nombre: 'profesional' } });
  await cambiarEstadoUsuario(7, true);
  expect(prisma.usuario.update).toHaveBeenLastCalledWith({ where: { id: 7 }, data: { activo: true, versionSesion: { increment: 1 } } });
});
test('protege las cuentas administrativas y devuelve 404 para una cuenta inexistente', async () => {
  prisma.usuario.findUnique.mockResolvedValue({ activo: true, rol: { nombre: 'administrador' } });
  await expect(cambiarEstadoUsuario(1, false)).rejects.toMatchObject({ estado: 409 });
  prisma.usuario.findUnique.mockResolvedValue(null);
  await expect(cambiarEstadoUsuario(99, false)).rejects.toMatchObject({ estado: 404 });
  expect(prisma.usuario.update).not.toHaveBeenCalled();
});

// Restablecer la contraseña (FS-HU-15): el código se usa una sola vez y, desde el 11-11-2026, se cierran las sesiones
// abiertas de la cuenta. Prisma se simula.
jest.mock('../../src/models/prisma', () => ({ $transaction: jest.fn() }));
const prisma = require('../../src/models/prisma');
const modelo = require('../../src/models/tokenRecuperacion.model');

test('usa el código una sola vez, cambia la contraseña y cierra las sesiones abiertas', async () => {
  const tx = { tokenRecuperacion: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) }, usuario: { update: jest.fn() } };
  prisma.$transaction.mockImplementation((tarea) => tarea(tx));
  expect(await modelo.usarYCambiarPassword({ id: 3, usuarioId: 7, passwordHash: 'hash-nuevo' })).toBe(true);
  expect(tx.tokenRecuperacion.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ id: 3, fechaUso: null }) }));
  expect(tx.usuario.update).toHaveBeenCalledWith({ where: { id: 7 }, data: { passwordHash: 'hash-nuevo', versionSesion: { increment: 1 } } });

  // Si otra petición ya usó el código, no cambia nada.
  tx.tokenRecuperacion.updateMany.mockResolvedValue({ count: 0 });
  tx.usuario.update.mockClear();
  expect(await modelo.usarYCambiarPassword({ id: 3, usuarioId: 7, passwordHash: 'otro' })).toBe(false);
  expect(tx.usuario.update).not.toHaveBeenCalled();
});

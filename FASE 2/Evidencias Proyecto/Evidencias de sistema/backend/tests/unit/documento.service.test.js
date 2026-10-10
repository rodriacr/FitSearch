jest.mock('node:fs/promises', () => ({ mkdir: jest.fn(), writeFile: jest.fn(), unlink: jest.fn(), readFile: jest.fn() }));
jest.mock('../../src/models/verificacion.model');
const fs = require('node:fs/promises');
const modelo = require('../../src/models/verificacion.model');
const servicio = require('../../src/services/documento.service');
beforeEach(() => { jest.resetAllMocks(); fs.mkdir.mockResolvedValue(); fs.writeFile.mockResolvedValue(); fs.unlink.mockResolvedValue(); });
test('rechaza archivos ejecutables o demasiado grandes antes de escribir', async () => {
  await expect(servicio.guardar(7, 'titulo', 'archivo.pdf', Buffer.from('<html>'))).rejects.toMatchObject({ estado: 400 });
  await expect(servicio.guardar(7, 'titulo', 'archivo.pdf', Buffer.alloc(5 * 1024 * 1024 + 1))).rejects.toMatchObject({ estado: 400 });
  expect(fs.writeFile).not.toHaveBeenCalled();
});
test('no usa el nombre del usuario como ruta y elimina el archivo si falla la base de datos', async () => {
  modelo.guardarDocumento.mockRejectedValue(new Error('base no disponible'));
  await expect(servicio.guardar(7, 'titulo', '../../archivo.pdf', Buffer.from('%PDF-1.7'))).rejects.toThrow('base no disponible');
  const ruta = fs.writeFile.mock.calls[0][0];
  expect(ruta).not.toContain('archivo.pdf');
  expect(fs.unlink).toHaveBeenCalledWith(ruta);
});
test('otro profesional y un usuario no pueden descargar documentos ajenos', async () => {
  modelo.buscarDocumento.mockResolvedValue({ id: 3, clave: '12345678-1234-1234-1234-123456789abc.data', profesional: { usuarioId: 7 } });
  await expect(servicio.descargar(3, { id: 8, rol: 'profesional' })).rejects.toMatchObject({ estado: 403 });
  await expect(servicio.descargar(3, { id: 7, rol: 'usuario' })).rejects.toMatchObject({ estado: 403 });
  expect(fs.readFile).not.toHaveBeenCalled();
  fs.readFile.mockResolvedValue(Buffer.from('%PDF-1.7'));
  expect((await servicio.descargar(3, { id: 7, rol: 'profesional' })).buffer).toEqual(Buffer.from('%PDF-1.7'));
  await servicio.descargar(3, { id: 1, rol: 'administrador' });
});

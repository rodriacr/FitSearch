// Ficha propia del profesional (FS-HU-04) en el modelo, con el cliente de Prisma simulado.
jest.mock('../../src/models/prisma', () => ({ $transaction: jest.fn(), $queryRaw: jest.fn(), profesional: { create: jest.fn(), updateMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() } }));
jest.mock('../../src/models/verificacion.model', () => ({ decidir: jest.fn() }));
const prisma = require('../../src/models/prisma');
const { guardarFicha, obtenerPorUsuario, verificarPerfil } = require('../../src/models/profesional.model');

// Respuestas de $queryRaw: la búsqueda por nombre devuelve el id y el bloqueo por id, si está activa.
function catalogo({ id = 4, activa = 1, existe = true } = {}) {
  prisma.$queryRaw.mockImplementation((partes) => Promise.resolve(
    !existe ? [] : partes.join('?').includes('FOR SHARE') ? [{ activa }] : [{ id }],
  ));
}
const sql = (llamada) => llamada[0].join('?').replace(/\s+/g, ' ');
const datos = { especialidad: 'Nutrición', descripcion: null, comuna: 'Providencia', modalidad: 'presencial', ubicacionLat: -33.43, ubicacionLng: -70.65 };
beforeEach(() => {
  jest.clearAllMocks();
  prisma.$transaction.mockImplementation((f) => f(prisma));
  prisma.profesional.findUnique.mockResolvedValue(null);
  // La especialidad elegida existe (id 4) y está activa (SELECT … FOR SHARE).
  catalogo({ activa: 1 });
});

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
  expect(prisma.profesional.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 2, revisionVerificacion: 3 }, data: expect.objectContaining({ verificado: false, estadoVerificacion: 'rechazado' }) }));
  prisma.profesional.updateMany.mockResolvedValue({ count: 0 });
  await expect(guardarFicha(7, datos)).rejects.toMatchObject({ estado: 409 });
});

test('la ficha propia se busca por la cuenta y devuelve solo sus campos', async () => {
  await obtenerPorUsuario(7);
  const [{ where, select }] = prisma.profesional.findUnique.mock.calls[0];
  expect(where).toEqual({ usuarioId: 7 });
  expect(Object.keys(select).sort()).toEqual(['comuna', 'descripcion', 'direccion', 'especialidad', 'id', 'modalidad', 'ubicacionLat', 'ubicacionLng', 'verificado']);
});

test('cambiar especialidad antes de postular no crea un motivo de rechazo', async () => {
  prisma.profesional.findUnique.mockResolvedValue({ id: 2, especialidad: 'Kinesiología', verificado: false, estadoVerificacion: 'sin_solicitud', revisionVerificacion: 3, historialVerificacion: [] });
  prisma.profesional.updateMany.mockResolvedValue({ count: 1 });
  await guardarFicha(7, datos);
  expect(prisma.profesional.updateMany.mock.calls[0][0].data).toMatchObject({ estadoVerificacion: 'sin_solicitud', motivoRechazo: null });
});

test('la ruta anterior aplica las mismas reglas de documentos e historial que el panel', async () => {
  await verificarPerfil(5, 7);
  expect(require('../../src/models/verificacion.model').decidir).toHaveBeenCalledWith(5, { accion: 'aprobar', administradorId: 7 });
});

test('guardar bloquea en modo compartido la especialidad elegida por su id, igual que el administrador', async () => {
  await guardarFicha(7, datos);
  const [busqueda, bloqueo] = prisma.$queryRaw.mock.calls;
  expect(sql(busqueda)).toBe('SELECT id FROM especialidades WHERE nombre = ?');
  expect(sql(bloqueo)).toBe('SELECT activa FROM especialidades WHERE id = ? AND nombre = ? FOR SHARE');
  expect(bloqueo.slice(1)).toEqual([4, 'Nutrición']);
  expect(prisma.$queryRaw.mock.invocationCallOrder[1]).toBeLessThan(prisma.profesional.create.mock.invocationCallOrder[0]);
});

test('si la especialidad se eliminó o se renombró mientras se guardaba, la ficha no se guarda', async () => {
  catalogo({ existe: false });
  await expect(guardarFicha(7, datos)).rejects.toMatchObject({ estado: 400, detalles: { especialidad: 'Selecciona tu especialidad' } });
  expect(prisma.profesional.create).not.toHaveBeenCalled();
  expect(prisma.profesional.updateMany).not.toHaveBeenCalled();
});

test('una especialidad desactivada solo se acepta si es la que la ficha ya tenía', async () => {
  catalogo({ activa: 0 });
  await expect(guardarFicha(7, datos)).rejects.toMatchObject({ estado: 400 });
  prisma.profesional.findUnique.mockResolvedValue({ id: 2, especialidad: 'Nutrición', verificado: false, estadoVerificacion: 'sin_solicitud', revisionVerificacion: 1 });
  prisma.profesional.updateMany.mockResolvedValue({ count: 1 });
  await guardarFicha(7, datos);
  expect(prisma.profesional.updateMany).toHaveBeenCalled();
});

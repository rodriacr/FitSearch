// Registro de agua (FS-HU-33) en el modelo, con el cliente de Prisma simulado.
jest.mock('../../src/models/prisma', () => ({
  $transaction: jest.fn(),
  $queryRaw: jest.fn(),
  registroAgua: { findMany: jest.fn(), aggregate: jest.fn(), create: jest.fn(), deleteMany: jest.fn() },
}));
const prisma = require('../../src/models/prisma');
const modelo = require('../../src/models/agua.model');

const DIA = new Date('2026-11-04T00:00:00Z');
beforeEach(() => {
  jest.clearAllMocks();
  prisma.$transaction.mockImplementation((funcion) => funcion(prisma));
  prisma.registroAgua.findMany.mockResolvedValue([]);
  sumaDelDia(0);
});
// $queryRaw: el bloqueo de la cuenta devuelve su id y la suma del día, el total indicado.
function sumaDelDia(total) {
  prisma.$queryRaw.mockImplementation((partes) => Promise.resolve(partes.join('?').includes('SUM(ml)') ? [{ total }] : [{ id: 7 }]));
}
const sql = (llamada) => llamada[0].join('?').replace(/\s+/g, ' ');

test('el día trae solo las sumas de la cuenta en esa fecha, en el orden en que se hicieron', async () => {
  await modelo.delDia(7, '2026-11-04');
  expect(prisma.registroAgua.findMany).toHaveBeenCalledWith({
    where: { usuarioId: 7, fecha: DIA }, select: { id: true, ml: true, fechaCreacion: true },
    orderBy: [{ fechaCreacion: 'asc' }, { id: 'asc' }],
  });
});

test('sumar guarda la cantidad en el día y devuelve el día actualizado', async () => {
  const actualizado = [{ id: 1, ml: 250 }];
  prisma.registroAgua.findMany.mockResolvedValue(actualizado);
  expect(await modelo.agregar(7, '2026-11-04', 250)).toBe(actualizado);
  expect(prisma.registroAgua.create).toHaveBeenCalledWith({ data: { usuarioId: 7, fecha: DIA, ml: 250 } });
});

test('se puede llegar justo al máximo del día', async () => {
  sumaDelDia(9750);
  await modelo.agregar(7, '2026-11-04', 250);
  expect(prisma.registroAgua.create).toHaveBeenCalled();
});

test('pasar el máximo del día no guarda nada e indica cuánto queda', async () => {
  sumaDelDia('9900');
  await expect(modelo.agregar(7, '2026-11-04', 250)).rejects.toMatchObject({
    estado: 400, message: 'Hoy puedes sumar hasta 100 ml más (el máximo es 10.000 ml al día)',
  });
  expect(prisma.registroAgua.create).not.toHaveBeenCalled();
});

test('deshacer solo borra una suma propia del día; si no la encuentra responde 404', async () => {
  prisma.registroAgua.deleteMany.mockResolvedValue({ count: 1 });
  await modelo.eliminar(7, '2026-11-04', 3);
  expect(prisma.registroAgua.deleteMany).toHaveBeenCalledWith({ where: { id: 3, usuarioId: 7, fecha: DIA } });
  prisma.registroAgua.deleteMany.mockResolvedValue({ count: 0 });
  await expect(modelo.eliminar(7, '2026-11-04', 3)).rejects.toMatchObject({ estado: 404 });
});

// Revisión del PR #48: dos sumas simultáneas pasaban el tope diario.
test('sumar bloquea la cuenta y lee el total con lectura bloqueante, antes de guardar', async () => {
  await modelo.agregar(7, '2026-11-04', 250);
  const [bloqueo, suma] = prisma.$queryRaw.mock.calls;
  expect(sql(bloqueo)).toBe('SELECT id FROM usuarios WHERE id = ? FOR UPDATE');
  expect(sql(suma)).toBe('SELECT COALESCE(SUM(ml), 0) AS total FROM registro_agua WHERE usuario_id = ? AND fecha = ? FOR SHARE');
  expect(suma.slice(1)).toEqual([7, '2026-11-04']);
  expect(prisma.$queryRaw.mock.invocationCallOrder[1]).toBeLessThan(prisma.registroAgua.create.mock.invocationCallOrder[0]);
});

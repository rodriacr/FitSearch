// Contenido del administrador (FS-HU-30): listados, uso de cada elemento, renombrar especialidades y no borrar lo que
// está en uso. Cliente de Prisma simulado; las transacciones usan el mismo cliente.
jest.mock('../../src/models/prisma', () => {
  const tabla = () => ({ findMany: jest.fn(), count: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() });
  const cliente = {
    especialidad: tabla(), alimento: tabla(), establecimiento: tabla(),
    profesional: { groupBy: jest.fn(), updateMany: jest.fn() },
  };
  cliente.$transaction = jest.fn((trabajo) => trabajo(cliente));
  return cliente;
});
const prisma = require('../../src/models/prisma');
const modelo = require('../../src/models/contenido.model');

const KINE = { id: 2, nombre: 'Kinesiología', activa: true };
const ARROZ = { id: 17, nombre: 'Arroz blanco cocido', sinonimos: 'arroz', calorias: '130.0', proteinasG: '2.7', carbohidratosG: '28.2', grasasG: '0.3', activo: true, _count: { registros: 4 } };

beforeEach(() => {
  jest.clearAllMocks();
  prisma.$transaction.mockImplementation((trabajo) => trabajo(prisma));
});

test('lista con búsqueda, estado y página, y cuenta las fichas que usan cada especialidad', async () => {
  prisma.especialidad.findMany.mockResolvedValue([KINE, { id: 4, nombre: 'Nutrición', activa: false }]);
  prisma.especialidad.count.mockResolvedValue(2);
  prisma.profesional.groupBy.mockResolvedValue([{ especialidad: 'Kinesiología', _count: { _all: 3 } }]);
  const { filas, total } = await modelo.listar('especialidades', { q: 'ki', estado: 'activos', pagina: 2, limite: 12 });
  expect(prisma.especialidad.findMany).toHaveBeenCalledWith(expect.objectContaining({
    where: { activa: true, OR: [{ nombre: { contains: 'ki' } }] }, skip: 12, take: 12,
  }));
  expect(prisma.profesional.groupBy).toHaveBeenCalledWith({ by: ['especialidad'], where: { especialidad: { in: ['Kinesiología', 'Nutrición'] } }, _count: { _all: true } });
  expect(filas.map(({ nombre, enUso }) => [nombre, enUso])).toEqual([['Kinesiología', 3], ['Nutrición', 0]]);
  expect(total).toBe(2);
});

test('los alimentos y los establecimientos buscan en sus campos y cuentan su uso con la relación', async () => {
  prisma.alimento.findMany.mockResolvedValue([ARROZ]);
  prisma.alimento.count.mockResolvedValue(1);
  const { filas } = await modelo.listar('alimentos', { q: 'arroz', estado: 'inactivos', pagina: 1, limite: 12 });
  expect(prisma.alimento.findMany).toHaveBeenCalledWith(expect.objectContaining({
    where: { activo: false, OR: [{ nombre: { contains: 'arroz' } }, { sinonimos: { contains: 'arroz' } }] },
  }));
  expect(filas[0].enUso).toBe(4);
  prisma.establecimiento.findMany.mockResolvedValue([]);
  prisma.establecimiento.count.mockResolvedValue(0);
  await modelo.listar('establecimientos', { q: 'Ñuñoa', estado: '', pagina: 1, limite: 12 });
  expect(prisma.establecimiento.findMany.mock.calls[0][0].where).toEqual({ OR: [{ nombre: { contains: 'Ñuñoa' } }, { comuna: { contains: 'Ñuñoa' } }, { direccion: { contains: 'Ñuñoa' } }] });
});

test('renombrar una especialidad actualiza las fichas que la usan, en la misma transacción', async () => {
  prisma.especialidad.findUnique.mockResolvedValueOnce(KINE).mockResolvedValueOnce({ ...KINE, nombre: 'Kinesiología deportiva' });
  prisma.profesional.groupBy.mockResolvedValue([]);
  const fila = await modelo.actualizar('especialidades', 2, { nombre: 'Kinesiología deportiva' });
  expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  expect(prisma.especialidad.update).toHaveBeenCalledWith({ where: { id: 2 }, data: { nombre: 'Kinesiología deportiva' } });
  expect(prisma.profesional.updateMany).toHaveBeenCalledWith({ where: { especialidad: 'Kinesiología' }, data: { especialidad: 'Kinesiología deportiva' } });
  expect(fila.nombre).toBe('Kinesiología deportiva');
});

test('un nombre repetido responde 409 y un elemento inexistente, 404', async () => {
  prisma.especialidad.create.mockRejectedValue(Object.assign(new Error('Unique'), { code: 'P2002' }));
  await expect(modelo.crear('especialidades', { nombre: 'Nutrición' })).rejects.toMatchObject({ estado: 409, detalles: { nombre: 'Ya existe una especialidad con ese nombre' } });
  prisma.alimento.findUnique.mockResolvedValue(null);
  await expect(modelo.actualizar('alimentos', 99, { nombre: 'Pan' })).rejects.toMatchObject({ estado: 404 });
  await expect(modelo.cambiarEstado('alimentos', 99, false)).rejects.toMatchObject({ estado: 404 });
});

test('desactivar cambia la columna de estado de cada catálogo', async () => {
  prisma.especialidad.findUnique.mockResolvedValue(KINE);
  prisma.profesional.groupBy.mockResolvedValue([]);
  await modelo.cambiarEstado('especialidades', 2, false);
  expect(prisma.especialidad.update).toHaveBeenCalledWith({ where: { id: 2 }, data: { activa: false } });
  prisma.alimento.findUnique.mockResolvedValue(ARROZ);
  await modelo.cambiarEstado('alimentos', 17, false);
  expect(prisma.alimento.update).toHaveBeenCalledWith({ where: { id: 17 }, data: { activo: false } });
});

test('no borra un elemento en uso y ofrece desactivarlo; uno sin uso se borra', async () => {
  prisma.alimento.findUnique.mockResolvedValueOnce(ARROZ).mockResolvedValueOnce({ ...ARROZ, _count: { registros: 0 } });
  await expect(modelo.eliminar('alimentos', 17)).rejects.toMatchObject({
    estado: 409, detalles: { enUso: 4 },
    message: 'No se puede eliminar «Arroz blanco cocido»: aparece en 4 registros de comidas. Puedes desactivarlo para que no aparezca al registrar comidas.',
  });
  expect(prisma.alimento.delete).not.toHaveBeenCalled();
  await modelo.eliminar('alimentos', 17);
  expect(prisma.alimento.delete).toHaveBeenCalledWith({ where: { id: 17 } });

  prisma.especialidad.findUnique.mockResolvedValue(KINE);
  prisma.profesional.groupBy.mockResolvedValue([{ especialidad: 'kinesiologia', _count: { _all: 1 } }]);
  await expect(modelo.eliminar('especialidades', 2)).rejects.toMatchObject({
    message: 'No se puede eliminar «Kinesiología»: la usa la ficha de 1 profesional. Puedes desactivarla para que no aparezca en fichas nuevas.',
  });
  prisma.establecimiento.findUnique.mockResolvedValue({ id: 5, nombre: 'Gimnasio Demo', _count: { profesionales: 2 } });
  await expect(modelo.eliminar('establecimientos', 5)).rejects.toMatchObject({
    message: 'No se puede eliminar «Gimnasio Demo»: tiene 2 profesionales asociados. Puedes desactivarlo para que no aparezca en el directorio.',
  });
});

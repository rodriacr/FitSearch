// Directorio de centros de salud y gimnasios (FS-HU-25) en el modelo, con el cliente de Prisma simulado.
jest.mock('../../src/models/prisma', () => ({ $queryRaw: jest.fn(), establecimiento: { findFirst: jest.fn(), findMany: jest.fn() } }));
const { Prisma } = require('@prisma/client');
const prisma = require('../../src/models/prisma');
const modelo = require('../../src/models/establecimiento.model');

// $queryRaw se llama como plantilla: se rearma la consulta para revisar el SQL y sus valores.
const consulta = (llamada) => Prisma.sql(...llamada);
beforeEach(() => {
  jest.clearAllMocks();
  prisma.$queryRaw.mockImplementation((partes) => Promise.resolve(partes.join('').includes('COUNT(*) AS total') ? [{ total: 4n }] : []));
});

test('solo lista establecimientos activos de la categoría pedida, ordenados por nombre', async () => {
  const resultado = await modelo.listar({ categoria: 'gimnasio', pagina: 2, limite: 12 });
  expect(resultado).toEqual({ filas: [], total: 4 });
  const { sql, values } = consulta(prisma.$queryRaw.mock.calls[0]);
  expect(sql).toMatch(/e\.activo = true AND e\.categoria = \?/);
  expect(sql).toMatch(/ORDER BY e\.nombre ASC, e\.id ASC/);
  expect(sql).not.toMatch(/ST_Distance_Sphere/);
  // Cuenta solo profesionales de cuentas activas con rol profesional.
  expect(sql).toMatch(/r\.nombre = 'profesional' AND u\.activo = true AND p\.establecimiento_id = e\.id/);
  expect(values).toEqual(['gimnasio', 12, 12]);
  // El total usa los mismos filtros.
  expect(consulta(prisma.$queryRaw.mock.calls[1]).sql).toMatch(/COUNT\(\*\) AS total FROM establecimientos e WHERE e\.activo = true AND e\.categoria = \?/);
});

test('con ubicación calcula la distancia en MySQL, filtra por comuna y radio y ordena por cercanía', async () => {
  await modelo.listar({
    categoria: 'centro_salud', comuna: 'Ñuñoa', ubicacion: { lat: -33.45, lng: -70.6 }, distanciaKm: 5, orden: 'cercania', pagina: 1, limite: 12,
  });
  const { sql, values } = consulta(prisma.$queryRaw.mock.calls[0]);
  expect(sql).toMatch(/ST_Distance_Sphere\(POINT\(e\.ubicacion_lng, e\.ubicacion_lat\), POINT\(\?, \?\)\) \/ 1000 AS distanciaKm/);
  expect(sql).toMatch(/AND e\.comuna = \? AND ST_Distance_Sphere\(.*\) \/ 1000 <= \?/);
  expect(sql).toMatch(/ORDER BY distanciaKm ASC, e\.id ASC/);
  expect(values).toEqual([-70.6, -33.45, 'centro_salud', 'Ñuñoa', -70.6, -33.45, 5, 12, 0]);
});

test('la ficha solo existe si el establecimiento está activo y trae a sus profesionales visibles', async () => {
  await modelo.buscarPorId(3);
  const [{ where, select }] = prisma.establecimiento.findFirst.mock.calls[0];
  expect(where).toEqual({ id: 3, activo: true });
  expect(select.profesionales.where).toEqual({ usuario: { activo: true, rol: { nombre: 'profesional' } } });
  // Nunca el correo ni otros datos de la cuenta: solo el nombre.
  expect(select.profesionales.select.usuario).toEqual({ select: { nombre: true } });
});

test('las comunas del filtro son las de establecimientos activos de la categoría, sin repetir', async () => {
  prisma.establecimiento.findMany.mockResolvedValue([{ comuna: 'Ñuñoa' }, { comuna: 'Providencia' }]);
  expect(await modelo.comunas('gimnasio')).toEqual(['Ñuñoa', 'Providencia']);
  expect(prisma.establecimiento.findMany).toHaveBeenCalledWith(expect.objectContaining({
    where: { activo: true, categoria: 'gimnasio', comuna: { not: null } }, distinct: ['comuna'],
  }));
});

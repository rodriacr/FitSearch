// Experiencia y configuración del profesional (FS-HU-29). Prisma se simula.
jest.mock('../../src/models/prisma', () => ({ profesional: { findUnique: jest.fn(), update: jest.fn() } }));
const { Prisma } = require('@prisma/client');
const prisma = require('../../src/models/prisma');
const servicio = require('../../src/services/cuentaProfesional.service');

beforeEach(() => jest.resetAllMocks());

test('escenario 1: guarda años, formación, a quién atiende, registro SIS y precio, normalizados', async () => {
  prisma.profesional.findUnique.mockResolvedValue({ id: 3 });
  prisma.profesional.update.mockImplementation(async ({ data }) => ({ ...data, formacion: data.formacion, atiendeA: data.atiendeA }));
  const { experiencia } = await servicio.guardarExperiencia(30, {
    aniosExperiencia: '8', formacion: [{ titulo: ' Nutricionista ', institucion: 'Universidad de Concepción', anio: 2016 }],
    atiendeA: ['adultos', 'deportistas', 'adultos'], registroSis: '93.952', precioDesde: '30000',
  });
  expect(prisma.profesional.update).toHaveBeenCalledWith(expect.objectContaining({
    where: { id: 3 },
    data: {
      aniosExperiencia: 8, formacion: [{ titulo: 'Nutricionista', institucion: 'Universidad de Concepción', anio: 2016 }],
      atiendeA: ['adultos', 'deportistas'], registroSis: '93952', precioDesde: 30000,
    },
  }));
  expect(experiencia.aniosExperiencia).toBe(8);
});

test('los campos vacíos se guardan vacíos (JSON nulo con DbNull)', () => {
  expect(servicio.validarExperiencia({ aniosExperiencia: '', formacion: [], atiendeA: [], registroSis: '', precioDesde: null })).toEqual({
    aniosExperiencia: null, formacion: Prisma.DbNull, atiendeA: Prisma.DbNull, registroSis: null, precioDesde: null,
  });
});

test.each([
  ['años negativos', { aniosExperiencia: -1 }, 'aniosExperiencia'],
  ['años con decimales', { aniosExperiencia: 2.5 }, 'aniosExperiencia'],
  ['más de 60 años', { aniosExperiencia: 61 }, 'aniosExperiencia'],
  ['título corto', { formacion: [{ titulo: 'N', institucion: 'UC' }] }, 'formacion.0.titulo'],
  ['año futuro', { formacion: [{ titulo: 'Nutricionista', institucion: 'UC', anio: 2099 }] }, 'formacion.0.anio'],
  ['demasiados estudios', { formacion: Array(9).fill({ titulo: 'Diplomado', institucion: 'UC' }) }, 'formacion'],
  ['opción desconocida', { atiendeA: ['mascotas'] }, 'atiendeA'],
  ['registro con letras', { registroSis: 'ABC123' }, 'registroSis'],
  ['precio fuera de rango', { precioDesde: 500 }, 'precioDesde'],
])('rechaza %s con el detalle del campo', (_caso, datos, campo) => {
  try {
    servicio.validarExperiencia(datos, 2026);
    throw new Error('debía fallar');
  } catch (error) {
    expect(error.estado).toBe(400);
    expect(error.detalles).toHaveProperty([campo]);
  }
});

test('escenario 2: guarda y aplica solo la preferencia que cambia; sin ficha responde 409', async () => {
  prisma.profesional.findUnique.mockResolvedValue({ id: 3 });
  prisma.profesional.update.mockResolvedValue({ autoconfirmar: true, avisosCorreo: true, recordatorios: true });
  expect(await servicio.guardarConfiguracion(30, { autoconfirmar: true, verificado: true })).toEqual({ configuracion: { autoconfirmar: true, avisosCorreo: true, recordatorios: true } });
  expect(prisma.profesional.update).toHaveBeenCalledWith(expect.objectContaining({ data: { autoconfirmar: true } }));
  await expect(servicio.guardarConfiguracion(30, { verificado: true })).rejects.toMatchObject({ estado: 400 });
  await expect(servicio.guardarConfiguracion(30, { recordatorios: 'no' })).rejects.toMatchObject({ estado: 400 });
  prisma.profesional.findUnique.mockResolvedValue(null);
  await expect(servicio.obtenerConfiguracion(30)).rejects.toMatchObject({ estado: 409 });
});

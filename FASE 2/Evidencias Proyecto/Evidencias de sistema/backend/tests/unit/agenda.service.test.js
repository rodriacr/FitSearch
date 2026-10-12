jest.mock('../../src/models/agenda.model');
const modelo = require('../../src/models/agenda.model');
const servicio = require('../../src/services/agenda.service');
const ahora = new Date('2026-10-11T18:00:00Z');
const horario = { fecha: '2026-10-12', horaInicio: '09:00', horaFin: '10:00' };
beforeEach(() => jest.resetAllMocks());

test('la consulta recibe hoy en Santiago y la respuesta pública no revela historial', async () => {
  jest.useFakeTimers().setSystemTime(ahora);
  try {
    modelo.listarDisponibilidad.mockResolvedValue([{
      id: 1, fecha: new Date('2026-10-12T00:00:00Z'),
      horaInicio: new Date('1970-01-01T09:00:00Z'),
      horaFin: new Date('1970-01-01T10:00:00Z'), _count: { reservas: 2 },
    }]);
    const publico = await servicio.listarDisponibilidad({ id: 7 }, 3);
    expect(modelo.listarDisponibilidad).toHaveBeenCalledWith({ id: 7 }, 3, new Date('2026-10-11T00:00:00Z'));
    expect(publico.horarios[0]).not.toHaveProperty('conHistorial');
    const propio = await servicio.listarDisponibilidad({ id: 7 });
    expect(propio.horarios[0].conHistorial).toBe(true);
  } finally { jest.useRealTimers(); }
});
test.each([
  { fecha: '2026-02-30' },
  { horaInicio: '25:00' },
  { horaFin: '08:00' },
  { fecha: '2026-10-10' },
  { fecha: '2028-01-01' },
])('rechaza horarios inválidos o fuera de plazo: %j', (cambios) => {
  expect(() =>
    servicio.validarHorario({ ...horario, ...cambios }, ahora),
  ).toThrow();
});
test('valida futuro en hora de Chile y permite bloques contiguos', () => {
  expect(servicio.ahoraChile(ahora)).toEqual({
    fecha: '2026-10-11',
    hora: '15:00',
  });
  expect(() =>
    servicio.validarHorario(
      {
        ...horario,
        fecha: '2026-10-11',
        horaInicio: '14:59',
        horaFin: '16:00',
      },
      ahora,
    ),
  ).toThrow();
  const d = servicio.validarHorario(horario, ahora);
  expect(d.fecha.toISOString()).toBe('2026-10-12T00:00:00.000Z');
  expect(d.horaInicio.toISOString()).toBe('1970-01-01T09:00:00.000Z');
});
test.each(['', 'corto', 'a'.repeat(501), null])(
  'la reserva exige un mensaje de 10 a 500 caracteres',
  async (mensaje) => {
    await expect(
      servicio.crearReserva(7, { disponibilidadId: 1, mensaje }),
    ).rejects.toMatchObject({ estado: 400 });
    expect(modelo.crearReserva).not.toHaveBeenCalled();
  },
);
test('solo admite confirmación o cancelación, sin reactivar desde la API', async () => {
  await expect(
    servicio.cambiarReserva({ id: 7 }, 1, 'pendiente'),
  ).rejects.toMatchObject({ estado: 400 });
});

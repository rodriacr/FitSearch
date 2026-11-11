// Clientes (FS-HU-27) y reportes (FS-HU-28) del profesional. Prisma se simula.
jest.mock('../../src/models/prisma', () => ({
  profesional: { findUnique: jest.fn() },
  reserva: { findMany: jest.fn() },
  resena: { findMany: jest.fn() },
  disponibilidad: { findMany: jest.fn() },
}));
const prisma = require('../../src/models/prisma');
const servicio = require('../../src/services/espacioProfesional.service');

const t = (hora) => new Date(`1970-01-01T${hora}:00Z`);
const d = (fecha) => new Date(`${fecha}T00:00:00Z`);
// Lunes 09-11-2026 a las 12:00 en Chile.
const ahora = new Date('2026-11-09T15:00:00Z');
const reserva = (id, usuario, fecha, hora, estado, extra = {}) => ({
  id, estado, mensaje: `Mensaje ${id}`, modalidad: null, primeraVisita: null, canceladaPor: null,
  fechaCreacion: new Date('2026-11-03T14:00:00Z'), usuario, disponibilidad: { fecha: d(fecha), horaInicio: t(hora), horaFin: t('23:00') }, ...extra,
});
const ana = { id: 4, nombre: 'Ana Pérez' };
const luis = { id: 5, nombre: 'Luis Soto' };
beforeEach(() => {
  jest.resetAllMocks();
  prisma.profesional.findUnique.mockResolvedValue({ id: 3 });
});

test('FS-HU-27: lista a cada cliente con su última cita, la próxima y la cantidad, sin datos de salud ni correo', async () => {
  // El modelo entrega las reservas de la más reciente a la más antigua.
  prisma.reserva.findMany.mockResolvedValue([
    reserva(4, ana, '2026-11-12', '10:00', 'pendiente'),
    reserva(3, luis, '2026-11-05', '09:00', 'cancelada', { canceladaPor: 'usuario' }),
    reserva(2, ana, '2026-11-02', '11:00', 'confirmada'),
    reserva(1, ana, '2026-10-20', '11:00', 'confirmada'),
  ]);
  const { clientes, total } = await servicio.clientes(30, ahora);
  expect(total).toBe(2);
  expect(clientes[0]).toEqual({
    id: 4, nombre: 'Ana Pérez', totalCitas: 3, citasRealizadas: 2, canceladas: 0, clienteDesde: '2026-10-20',
    ultimaCita: { reservaId: 2, fecha: '2026-11-02', horaInicio: '11:00', horaFin: '23:00', estado: 'confirmada' },
    proximaCita: { reservaId: 4, fecha: '2026-11-12', horaInicio: '10:00', horaFin: '23:00', estado: 'pendiente' },
  });
  expect(clientes[1]).toMatchObject({ id: 5, totalCitas: 1, canceladas: 1, ultimaCita: null, proximaCita: null });
  expect(JSON.stringify(clientes)).not.toMatch(/correo|salud/);
  expect(prisma.reserva.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { disponibilidad: { profesionalId: 3 } } }));
});

test('FS-HU-27: el historial muestra las citas de ese cliente con este profesional y 404 si no reservó con él', async () => {
  prisma.reserva.findMany.mockResolvedValue([reserva(2, ana, '2026-11-02', '11:00', 'confirmada', { modalidad: 'online', primeraVisita: true })]);
  const { cliente, citas } = await servicio.historial(30, 4);
  expect(cliente).toEqual({ id: 4, nombre: 'Ana Pérez' });
  expect(citas[0]).toMatchObject({ fecha: '2026-11-02', estado: 'confirmada', mensaje: 'Mensaje 2', modalidad: 'online', primeraVisita: true });
  expect(prisma.reserva.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { usuarioId: 4, disponibilidad: { profesionalId: 3 } } }));
  prisma.reserva.findMany.mockResolvedValue([]);
  await expect(servicio.historial(30, 99)).rejects.toMatchObject({ estado: 404 });
});

test('sin ficha profesional responde 409', async () => {
  prisma.profesional.findUnique.mockResolvedValue(null);
  await expect(servicio.clientes(30, ahora)).rejects.toMatchObject({ estado: 409 });
  await expect(servicio.reportes(30, 8, ahora)).rejects.toMatchObject({ estado: 409 });
});

test('FS-HU-28: reservas por semana y estado, calificación, demanda, ocupación y la semana actual', async () => {
  prisma.reserva.findMany
    .mockResolvedValueOnce([
      reserva(5, ana, '2026-11-10', '09:00', 'pendiente', { fechaCreacion: new Date('2026-11-08T23:30:00Z') }), // domingo 20:30
      reserva(4, luis, '2026-11-09', '19:00', 'cancelada'),
      reserva(3, ana, '2026-11-04', '15:00', 'confirmada'),
      reserva(2, ana, '2026-09-01', '10:00', 'confirmada'), // período anterior
    ])
    .mockResolvedValueOnce([{ usuarioId: 4 }]); // Ana ya había reservado antes del período
  prisma.resena.findMany.mockResolvedValue([{ puntaje: 5, reservaId: 3 }, { puntaje: 4, reservaId: null }]);
  prisma.disponibilidad.findMany.mockResolvedValue([
    { id: 1, retirado: false, reservas: [{ id: 5 }] }, { id: 2, retirado: false, reservas: [] }, { id: 3, retirado: true, reservas: [] }, { id: 4, retirado: false, reservas: [{ id: 3 }] },
  ]);
  const r = await servicio.reportes(30, 8, ahora);
  expect(r.periodo).toEqual({ desde: '2026-09-21', hasta: '2026-11-15', semanas: 8, hoy: '2026-11-09' });
  expect(r.porSemana).toHaveLength(8);
  expect(r.porSemana.at(-1)).toEqual({ desde: '2026-11-09', hasta: '2026-11-15', actual: true, pendiente: 1, confirmada: 0, cancelada: 1 });
  expect(r.porSemana.at(-2)).toMatchObject({ desde: '2026-11-02', confirmada: 1 });
  expect(r.totales).toMatchObject({ reservas: 3, confirmadas: 1, pendientes: 1, canceladas: 1, clientes: 2, clientesNuevos: 1, tasaCancelacion: 33, ocupacion: 67, horariosPublicados: 3, fueraDeHorario: 1 });
  expect(r.anterior).toMatchObject({ desde: '2026-07-27', hasta: '2026-09-20', reservas: 1 });
  expect(r.calificacion).toEqual({ promedio: 4.5, total: 2, verificadas: 1, distribucion: { 5: 1, 4: 1, 3: 0, 2: 0, 1: 0 } });
  expect(r.demandaDia.find((x) => x.dia === 'Martes').reservas).toBe(1);
  expect(r.demandaFranja).toEqual([{ franja: 'manana', reservas: 1 }, { franja: 'tarde', reservas: 1 }, { franja: 'noche', reservas: 0 }]);
  expect(r.semanaActual).toMatchObject({ desde: '2026-11-09', reservas: 2, confirmadas: 0, canceladas: 1, pendientes: 1, clientesNuevos: 1 });
});

test('FS-HU-28: la consulta conserva los dos límites de fechas y cada período ignora lo que queda fuera', async () => {
  prisma.reserva.findMany
    .mockResolvedValueOnce([
      reserva(9, ana, '2026-11-20', '10:00', 'confirmada'), // después de esta semana: no cuenta
      reserva(8, ana, '2026-11-10', '10:00', 'confirmada'), // dentro del período
      reserva(7, luis, '2026-09-21', '10:00', 'pendiente'), // primer día del período
      reserva(6, luis, '2026-09-20', '10:00', 'cancelada'), // último día del período anterior
      reserva(5, luis, '2026-07-27', '10:00', 'confirmada'), // primer día del período anterior
      reserva(4, ana, '2026-07-26', '10:00', 'confirmada'), // antes del período anterior: no cuenta
    ])
    .mockResolvedValueOnce([]);
  prisma.resena.findMany.mockResolvedValue([]);
  prisma.disponibilidad.findMany.mockResolvedValue([]);
  const r = await servicio.reportes(30, 8, ahora);
  expect(prisma.reserva.findMany.mock.calls[0][0].where).toEqual({
    disponibilidad: { fecha: { gte: d('2026-07-27'), lte: d('2026-11-15') }, profesionalId: 3 },
  });
  expect(r.totales).toMatchObject({ reservas: 2, confirmadas: 1, pendientes: 1, canceladas: 0 });
  expect(r.anterior).toMatchObject({ desde: '2026-07-27', hasta: '2026-09-20', reservas: 2, confirmadas: 1, canceladas: 1 });
  expect(r.porSemana.reduce((suma, s) => suma + s.pendiente + s.confirmada + s.cancelada, 0)).toBe(2);
  expect(r.semanaActual).toMatchObject({ reservas: 1, confirmadas: 1 });
});

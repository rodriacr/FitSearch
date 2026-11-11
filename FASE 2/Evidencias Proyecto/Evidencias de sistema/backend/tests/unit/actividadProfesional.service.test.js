jest.mock('../../src/models/actividadProfesional.model');
const modelo = require('../../src/models/actividadProfesional.model');
const servicio = require('../../src/services/actividadProfesional.service');

// Martes 10-11-2026, 12:00 en Santiago (UTC-3).
const ahora = new Date('2026-11-10T15:00:00Z');

// Reserva tal como la entrega el modelo (las horas TIME llegan como fechas de 1970 en UTC).
const reserva = (id, usuario, fecha, horaInicio, estado, creada = '2026-10-01T15:00:00Z') => ({
  id,
  estado,
  mensaje: 'Necesito una evaluación de rodilla',
  fechaCreacion: new Date(creada),
  usuario,
  disponibilidad: {
    fecha: new Date(`${fecha}T00:00:00Z`),
    horaInicio: new Date(`1970-01-01T${horaInicio}:00Z`),
    horaFin: new Date(`1970-01-01T${horaInicio.slice(0, 2)}:45:00Z`),
  },
});
const camila = { id: 21, nombre: 'Camila Rojas' };
const pedro = { id: 22, nombre: 'Pedro Soto' };
const lucia = { id: 23, nombre: 'Lucía Díaz' };

// Ordenadas como las entrega el modelo: de la cita más reciente a la más antigua.
const filas = [
  reserva(6, lucia, '2026-11-20', '10:00', 'pendiente', '2026-11-09T13:00:00Z'),
  reserva(5, camila, '2026-11-12', '09:00', 'confirmada'),
  reserva(4, pedro, '2026-11-10', '11:00', 'confirmada'),
  reserva(3, camila, '2026-11-10', '13:00', 'cancelada'),
  reserva(2, pedro, '2026-11-02', '09:00', 'pendiente'),
  reserva(1, camila, '2026-10-20', '09:00', 'confirmada'),
];

beforeEach(() => {
  jest.resetAllMocks();
  modelo.fichaDe.mockResolvedValue({ id: 3 });
});

test('agrupa las reservas por persona, sin correo ni datos de salud, con su próxima y última cita', async () => {
  modelo.reservas.mockResolvedValue(filas);
  const { clientes, zonaHoraria } = await servicio.listarClientes(7, ahora);
  expect(modelo.fichaDe).toHaveBeenCalledWith(7);
  expect(modelo.reservas).toHaveBeenCalledWith(3);
  expect(zonaHoraria).toBe('America/Santiago');
  // Primero quienes tienen una cita próxima (la más cercana arriba); Pedro no tiene y queda al final.
  expect(clientes.map((c) => c.nombre)).toEqual(['Camila Rojas', 'Lucía Díaz', 'Pedro Soto']);
  const [camilaResumen, , pedroResumen] = clientes;
  expect(Object.keys(camilaResumen).sort()).toEqual(['estados', 'id', 'nombre', 'primeraReserva', 'proximaCita', 'totalCitas', 'ultimaCita']);
  expect(camilaResumen).toMatchObject({
    totalCitas: 3,
    proximaCita: { fecha: '2026-11-12', horaInicio: '09:00' },
    // La cita cancelada de hoy no cuenta como última cita.
    ultimaCita: { fecha: '2026-10-20', horaInicio: '09:00' },
    estados: { confirmadas: 1, realizadas: 1, canceladas: 1, pendientes: 0, sinConfirmar: 0 },
  });
  // La cita de las 11:00 de hoy ya comenzó: se cuenta como realizada. La pendiente del 02-11 quedó sin confirmar.
  expect(pedroResumen).toMatchObject({ proximaCita: null, ultimaCita: { fecha: '2026-11-10', horaInicio: '11:00' } });
  expect(pedroResumen.estados).toMatchObject({ realizadas: 1, sinConfirmar: 1 });
});

test('sin reservas, la lista de clientes queda vacía', async () => {
  modelo.reservas.mockResolvedValue([]);
  expect((await servicio.listarClientes(7, ahora)).clientes).toEqual([]);
});

test('el historial de un cliente lista sus citas y marca las que ya pasaron', async () => {
  modelo.reservas.mockResolvedValue(filas.filter((f) => f.usuario.id === 22));
  const { cliente, citas } = await servicio.historialCliente(7, 22, ahora);
  expect(modelo.reservas).toHaveBeenCalledWith(3, 22);
  expect(cliente).toMatchObject({ id: 22, nombre: 'Pedro Soto', totalCitas: 2 });
  expect(citas.map((c) => [c.id, c.pasada])).toEqual([[4, true], [2, true]]);
  expect(citas[0].horario).toEqual({ fecha: '2026-11-10', horaInicio: '11:00', horaFin: '11:45' });
});

test('una persona que nunca reservó con el profesional responde 404', async () => {
  modelo.reservas.mockResolvedValue([]);
  await expect(servicio.historialCliente(7, 99, ahora)).rejects.toMatchObject({ estado: 404 });
});

test('los reportes cuentan las reservas por semana de la cita, por estado y la calificación promedio', async () => {
  modelo.reservas.mockResolvedValue(filas);
  modelo.calificacion.mockResolvedValue({ promedio: 4.3333, cantidad: 3 });
  const r = await servicio.reportes(7, { semanas: 4 }, ahora);
  expect(r.semanas.map((s) => [s.inicio, s.fin, s.total])).toEqual([
    ['2026-10-19', '2026-10-25', 1],
    ['2026-10-26', '2026-11-01', 0],
    ['2026-11-02', '2026-11-08', 1],
    ['2026-11-09', '2026-11-15', 3],
  ]);
  expect(r.semanas[3]).toMatchObject({ realizadas: 1, confirmadas: 1, canceladas: 1 });
  expect(r.totales).toEqual({ total: 6, pendientes: 1, confirmadas: 1, realizadas: 2, sinConfirmar: 1, canceladas: 1 });
  expect(r.calificacion).toEqual({ promedio: 4.3, cantidad: 3 });
  expect(r.resumenSemanal).toEqual({
    inicio: '2026-11-09', fin: '2026-11-15',
    totalClientes: 3, citasRealizadas: 1, citasPendientes: 1, clientesNuevos: 1,
  });
});

test('sin reseñas, la calificación promedio es null y por defecto se muestran 8 semanas', async () => {
  modelo.reservas.mockResolvedValue([]);
  modelo.calificacion.mockResolvedValue({ promedio: null, cantidad: 0 });
  const r = await servicio.reportes(7, {}, ahora);
  expect(r.semanas).toHaveLength(8);
  expect(r.calificacion).toEqual({ promedio: null, cantidad: 0 });
  expect(r.resumenSemanal.totalClientes).toBe(0);
});

test('sin ficha profesional no hay clientes ni reportes', async () => {
  modelo.fichaDe.mockRejectedValue(Object.assign(new Error('Completa tu ficha'), { estado: 409 }));
  await expect(servicio.listarClientes(7, ahora)).rejects.toMatchObject({ estado: 409 });
  await expect(servicio.reportes(7, {}, ahora)).rejects.toMatchObject({ estado: 409 });
});

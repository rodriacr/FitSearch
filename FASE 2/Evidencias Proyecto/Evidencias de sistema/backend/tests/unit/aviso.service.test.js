// Avisos por correo de la agenda, lista de espera y recordatorios (09-11-2026). El correo y los datos se simulan.
jest.mock('../../src/models/aviso.model');
jest.mock('../../src/services/correo.service');
jest.mock('../../src/models/prisma', () => ({ reserva: { findMany: jest.fn(), updateMany: jest.fn() } }));
const modelo = require('../../src/models/aviso.model');
const correo = require('../../src/services/correo.service');
const prisma = require('../../src/models/prisma');
const avisos = require('../../src/services/aviso.service');
const recordatorios = require('../../src/services/recordatorio.service');

const t = (hora) => new Date(`1970-01-01T${hora}:00Z`);
const persona = (nombre, correoPersona) => ({ nombre, correo: correoPersona, activo: true });
const reserva = (sobrescribir = {}) => ({
  id: 5, estado: 'pendiente', modalidad: 'online', primeraVisita: true, canceladaPor: null, usuario: persona('Ana Pérez', 'ana@example.test'),
  disponibilidad: {
    fecha: new Date('2026-11-10T00:00:00Z'), horaInicio: t('09:00'), horaFin: t('10:00'),
    profesional: { id: 3, avisosCorreo: true, recordatorios: true, usuario: persona('Camila Rojas', 'camila@example.test') },
  },
  ...sobrescribir,
});
beforeEach(() => jest.resetAllMocks());

test('escribe la fecha de la cita en español y en hora de Chile', () => {
  expect(avisos.cuando(reserva().disponibilidad)).toBe('martes 10 de noviembre, 09:00 a 10:00 (hora de Chile)');
});

test('una solicitud nueva avisa al profesional, salvo que haya desactivado los avisos', async () => {
  modelo.datosReserva.mockResolvedValue(reserva());
  await avisos.reservaCreada(5);
  expect(correo.enviarAviso).toHaveBeenCalledWith(expect.objectContaining({
    para: 'camila@example.test', nombre: 'Camila', asunto: 'Tienes una solicitud de reserva', accion: { texto: 'Abrir mi agenda', ruta: '/profesional/agenda' },
  }));
  expect(correo.enviarAviso.mock.calls[0][0].parrafos.join(' ')).toMatch(/Online · Primera visita/);
  correo.enviarAviso.mockClear();
  const sinAvisos = reserva();
  sinAvisos.disponibilidad.profesional.avisosCorreo = false;
  modelo.datosReserva.mockResolvedValue(sinAvisos);
  await avisos.reservaCreada(5);
  expect(correo.enviarAviso).not.toHaveBeenCalled();
});

test('confirmar avisa al usuario; si el usuario cancela, se avisa al profesional', async () => {
  modelo.datosReserva.mockResolvedValue(reserva({ estado: 'confirmada' }));
  await avisos.reservaCambiada(5);
  expect(correo.enviarAviso).toHaveBeenLastCalledWith(expect.objectContaining({ para: 'ana@example.test', asunto: 'Tu cita fue confirmada' }));
  modelo.datosReserva.mockResolvedValue(reserva({ estado: 'cancelada', canceladaPor: 'usuario' }));
  await avisos.reservaCambiada(5);
  expect(correo.enviarAviso).toHaveBeenLastCalledWith(expect.objectContaining({ para: 'camila@example.test', asunto: 'Una reserva fue cancelada' }));
  modelo.datosReserva.mockResolvedValue(reserva({ estado: 'cancelada', canceladaPor: 'profesional' }));
  await avisos.reservaCambiada(5);
  expect(correo.enviarAviso).toHaveBeenLastCalledWith(expect.objectContaining({ para: 'ana@example.test', asunto: 'Tu cita fue cancelada' }));
});

test('la lista de espera avisa una vez y saca solo a quienes recibieron el correo', async () => {
  modelo.listaEspera.mockResolvedValue({
    profesional: { especialidad: 'Nutrición', usuario: { nombre: 'Camila Rojas' } },
    filas: [{ id: 1, usuario: persona('Ana', 'ana@example.test') }, { id: 2, usuario: persona('Luis', 'luis@example.test') }, { id: 3, usuario: { ...persona('Eva', 'eva@example.test'), activo: false } }],
  });
  correo.enviarAviso.mockResolvedValueOnce().mockRejectedValueOnce(new Error('SMTP caído'));
  const espia = jest.spyOn(console, 'error').mockImplementation(() => {});
  expect(await avisos.horaLiberada(3)).toBe(2);
  espia.mockRestore();
  expect(correo.enviarAviso).toHaveBeenCalledTimes(2);
  expect(correo.enviarAviso.mock.calls[0][0]).toMatchObject({ asunto: 'Camila Rojas tiene horas disponibles', accion: { ruta: '/profesionales/3' } });
  // Luis no recibió el correo: sigue en la lista. Eva (cuenta desactivada) sale sin correo.
  expect(modelo.sacarDeLaLista).toHaveBeenCalledWith([1, 3]);
});

test('recordatorio: envía uno por cita confirmada de las próximas 24 horas y no repite', async () => {
  // Lunes 09-11-2026 a las 10:00 en Chile.
  const ahora = new Date('2026-11-09T13:00:00Z');
  const cita = (id, fecha, hora) => ({ id, usuario: { nombre: 'Ana', correo: 'ana@example.test' },
    disponibilidad: { fecha: new Date(`${fecha}T00:00:00Z`), horaInicio: t(hora), horaFin: t('23:00'), profesional: { usuario: { nombre: 'Camila' } } } });
  prisma.reserva.findMany.mockResolvedValue([cita(1, '2026-11-09', '09:00'), cita(2, '2026-11-09', '18:00'), cita(3, '2026-11-10', '09:30'), cita(4, '2026-11-10', '10:30')]);
  prisma.reserva.updateMany.mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 0 });
  correo.enviarAviso.mockResolvedValue();
  expect(await recordatorios.enviarPendientes(ahora)).toBe(1);
  // Solo las citas 2 y 3 caen en la ventana; la 3 ya la tomó otro proceso (count 0).
  expect(prisma.reserva.updateMany.mock.calls.map(([consulta]) => consulta.where.id)).toEqual([2, 3]);
  expect(correo.enviarAviso).toHaveBeenCalledTimes(1);
  expect(correo.enviarAviso.mock.calls[0][0]).toMatchObject({ asunto: 'Recordatorio de tu cita', para: 'ana@example.test' });
  expect(prisma.reserva.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ estado: 'confirmada', recordatorioEn: null }) }));
});

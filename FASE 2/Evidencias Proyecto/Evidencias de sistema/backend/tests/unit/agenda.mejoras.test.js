// Mejoras de la agenda del 09-11-2026: horarios en serie, calendario semanal, fechas bloqueadas,
// reserva con modalidad y primera visita, y avisos (lista de espera y correos). El acceso a datos y los correos se simulan.
jest.mock('../../src/models/agenda.model');
jest.mock('../../src/services/chat.service');
jest.mock('../../src/services/aviso.service');
const modelo = require('../../src/models/agenda.model');
const chats = require('../../src/services/chat.service');
const avisos = require('../../src/services/aviso.service');
const servicio = require('../../src/services/agenda.service');

// Domingo 08-11-2026 a las 15:00 en Chile (18:00 UTC, horario de verano UTC-3).
const ahora = new Date('2026-11-08T18:00:00Z');
const t = (hora) => new Date(`1970-01-01T${hora}:00Z`);
const d = (fecha) => new Date(`${fecha}T00:00:00Z`);
beforeEach(() => jest.resetAllMocks());

describe('horarios en serie', () => {
  test('divide el rango en bloques de igual duración, ignora el sobrante y avisa a la lista de espera', async () => {
    modelo.guardarSerie.mockImplementation(async (_usuario, bloques) => ({
      creados: bloques.slice(1).map((b, i) => ({ id: i + 1, profesionalId: 3, ...b, reservas: [] })),
      omitidos: [bloques[0]],
    }));
    const r = await servicio.guardarSerie(7, { fecha: '2026-11-10', horaInicio: '09:00', horaFin: '11:00', duracion: 45 }, ahora);
    const enviados = modelo.guardarSerie.mock.calls[0][1].map((b) => `${b.horaInicio.toISOString().slice(11, 16)}-${b.horaFin.toISOString().slice(11, 16)}`);
    expect(enviados).toEqual(['09:00-09:45', '09:45-10:30']);
    expect(r.horarios.map((h) => h.horaInicio)).toEqual(['09:45']);
    expect(r.omitidos).toEqual([{ horaInicio: '09:00', horaFin: '09:45' }]);
    expect(avisos.avisarHoraLiberada).toHaveBeenCalledWith(3);
  });

  test.each([
    ['duración fuera de la lista', { duracion: 40 }],
    ['rango menor que un bloque', { horaFin: '09:20' }],
    ['más bloques que el máximo', { horaInicio: '00:00', horaFin: '23:30', duracion: 30 }],
    ['día pasado', { fecha: '2026-11-07' }],
  ])('rechaza %s', async (_caso, cambios) => {
    await expect(servicio.guardarSerie(7, { fecha: '2026-11-10', horaInicio: '09:00', horaFin: '11:00', duracion: 30, ...cambios }, ahora))
      .rejects.toMatchObject({ estado: 400 });
    expect(modelo.guardarSerie).not.toHaveBeenCalled();
  });

  test('un horario nuevo avisa a la lista de espera; editar uno existente no', async () => {
    modelo.guardarDisponibilidad.mockResolvedValue({ id: 9, profesionalId: 3, fecha: d('2026-11-10'), horaInicio: t('09:00'), horaFin: t('10:00') });
    jest.useFakeTimers().setSystemTime(ahora);
    try {
      await servicio.guardarDisponibilidad(7, null, { fecha: '2026-11-10', horaInicio: '09:00', horaFin: '10:00' });
      expect(avisos.avisarHoraLiberada).toHaveBeenCalledWith(3);
      avisos.avisarHoraLiberada.mockClear();
      await servicio.guardarDisponibilidad(7, 9, { fecha: '2026-11-10', horaInicio: '09:00', horaFin: '10:00' });
      expect(avisos.avisarHoraLiberada).not.toHaveBeenCalled();
    } finally { jest.useRealTimers(); }
  });
});

describe('calendario semanal', () => {
  test('pide de lunes a domingo y marca estados, horas pasadas y días bloqueados', async () => {
    modelo.semana.mockResolvedValue({
      enEspera: 2, modalidad: 'ambas',
      bloqueos: [{ id: 1, fechaInicio: d('2026-11-07'), fechaFin: d('2026-11-07'), motivo: 'Congreso' }],
      bloques: [
        { id: 1, fecha: d('2026-11-02'), horaInicio: t('09:00'), horaFin: t('10:00'), reservas: [], _count: { reservas: 0 } },
        { id: 2, fecha: d('2026-11-08'), horaInicio: t('16:00'), horaFin: t('17:00'), _count: { reservas: 1 },
          reservas: [{ id: 5, estado: 'pendiente', mensaje: 'Evaluación', modalidad: 'online', primeraVisita: true, usuario: { id: 4, nombre: 'Ana' } }] },
        { id: 3, fecha: d('2026-11-07'), horaInicio: t('10:00'), horaFin: t('11:00'), reservas: [], _count: { reservas: 0 } },
      ],
    });
    const r = await servicio.semana(7, '2026-11-05', ahora);
    expect(modelo.semana).toHaveBeenCalledWith(7, d('2026-11-02'), d('2026-11-08'));
    expect(r).toMatchObject({ desde: '2026-11-02', hasta: '2026-11-08', hoy: '2026-11-08', ahora: '15:00', listaEspera: 2, modalidad: 'ambas' });
    expect(r.bloqueos).toEqual([{ id: 1, fechaInicio: '2026-11-07', fechaFin: '2026-11-07', motivo: 'Congreso' }]);
    expect(r.horarios[0]).toMatchObject({ id: 1, estado: 'libre', pasado: true, bloqueado: false, reserva: null });
    expect(r.horarios[1]).toMatchObject({ id: 2, estado: 'pendiente', pasado: false, reserva: { id: 5, usuario: { id: 4, nombre: 'Ana' }, modalidad: 'online', primeraVisita: true } });
    expect(r.horarios[2]).toMatchObject({ id: 3, bloqueado: true });
  });

  test('sin fecha usa la semana actual en Chile y rechaza una fecha inválida', async () => {
    modelo.semana.mockResolvedValue({ bloques: [], bloqueos: [], enEspera: 0, modalidad: 'presencial' });
    expect((await servicio.semana(7, undefined, ahora)).desde).toBe('2026-11-02');
    await expect(servicio.semana(7, '2026-02-30', ahora)).rejects.toMatchObject({ estado: 400 });
  });
});

describe('fechas bloqueadas', () => {
  test('normaliza el bloqueo y valida fechas, orden, plazo y motivo', () => {
    expect(servicio.validarBloqueo({ fechaInicio: '2026-11-08', fechaFin: '2026-11-15', motivo: '  Vacaciones ' }, ahora))
      .toEqual({ fechaInicio: d('2026-11-08'), fechaFin: d('2026-11-15'), motivo: 'Vacaciones' });
    expect(servicio.validarBloqueo({ fechaInicio: '2026-11-08', fechaFin: '2026-11-08' }, ahora).motivo).toBeNull();
    for (const datos of [
      { fechaInicio: '2026-11-07', fechaFin: '2026-11-08' },
      { fechaInicio: '2026-11-10', fechaFin: '2026-11-09' },
      { fechaInicio: '2026-11-08', fechaFin: '2027-03-01' },
      { fechaInicio: '2026-11-08', fechaFin: '2026-11-09', motivo: 'a'.repeat(101) },
      { fechaInicio: 'mañana', fechaFin: '2026-11-09' },
    ]) expect(() => servicio.validarBloqueo(datos, ahora)).toThrow();
  });

  test('al quitar un bloqueo con horas libres avisa a la lista de espera', async () => {
    modelo.eliminarBloqueo.mockResolvedValue({ id: 4, profesionalId: 3, liberaHoras: true });
    expect(await servicio.eliminarBloqueo(7, 4, ahora)).toEqual({ id: 4 });
    expect(modelo.eliminarBloqueo).toHaveBeenCalledWith(7, 4, d('2026-11-08'));
    expect(avisos.avisarHoraLiberada).toHaveBeenCalledWith(3);
    modelo.eliminarBloqueo.mockResolvedValue({ id: 5, profesionalId: 3, liberaHoras: false });
    avisos.avisarHoraLiberada.mockClear();
    await servicio.eliminarBloqueo(7, 5, ahora);
    expect(avisos.avisarHoraLiberada).not.toHaveBeenCalled();
  });
});

describe('reserva con modalidad y primera visita', () => {
  const reservaCompleta = {
    id: 8, estado: 'pendiente', mensaje: 'Quiero una evaluación', fechaCreacion: new Date('2026-11-08T18:00:00Z'), modalidad: 'online', primeraVisita: true,
    canceladaPor: null, usuario: { id: 7, nombre: 'Ana' },
    disponibilidad: { id: 2, fecha: d('2026-11-10'), horaInicio: t('09:00'), horaFin: t('10:00'), profesional: { id: 3, especialidad: 'Nutrición', usuario: { nombre: 'Camila' } } },
  };

  test('envía la modalidad y la primera visita al modelo, devuelve ambos datos y avisa al profesional', async () => {
    modelo.crearReserva.mockResolvedValue(reservaCompleta);
    const { reserva } = await servicio.crearReserva(7, { disponibilidadId: 2, mensaje: '  Quiero una evaluación ', modalidad: 'online', primeraVisita: true });
    expect(modelo.crearReserva).toHaveBeenCalledWith(7, { disponibilidadId: 2, mensaje: 'Quiero una evaluación', modalidad: 'online', primeraVisita: true }, expect.any(Function));
    expect(reserva).toMatchObject({ modalidad: 'online', primeraVisita: true, profesional: { id: 3, especialidad: 'Nutrición' } });
    expect(avisos.avisarReservaCreada).toHaveBeenCalledWith(8);
  });

  test('rechaza una modalidad desconocida o una primera visita que no es sí o no', async () => {
    await expect(servicio.crearReserva(7, { disponibilidadId: 2, mensaje: 'Quiero una evaluación', modalidad: 'domicilio' })).rejects.toMatchObject({ estado: 400 });
    await expect(servicio.crearReserva(7, { disponibilidadId: 2, mensaje: 'Quiero una evaluación', primeraVisita: 'quizás' })).rejects.toMatchObject({ estado: 400 });
    expect(modelo.crearReserva).not.toHaveBeenCalled();
  });

  test('cancelar avisa a la otra persona y a la lista de espera; confirmar solo a la otra persona', async () => {
    modelo.cambiarReserva.mockResolvedValue({ ...reservaCompleta, estado: 'cancelada', canceladaPor: 'usuario' });
    expect((await servicio.cambiarReserva({ id: 7, rol: 'usuario' }, 8, 'cancelada')).reserva.canceladaPor).toBe('usuario');
    expect(avisos.avisarReservaCambiada).toHaveBeenCalledWith(8);
    expect(avisos.avisarHoraLiberada).toHaveBeenCalledWith(3);
    jest.clearAllMocks();
    modelo.cambiarReserva.mockResolvedValue({ ...reservaCompleta, estado: 'confirmada' });
    await servicio.cambiarReserva({ id: 9, rol: 'profesional' }, 8, 'confirmada');
    expect(avisos.avisarReservaCambiada).toHaveBeenCalledWith(8);
    expect(avisos.avisarHoraLiberada).not.toHaveBeenCalled();
  });

  test('Mis citas informa los mensajes sin leer del chat con ese profesional (uno por pareja)', async () => {
    modelo.listarReservas.mockResolvedValue([reservaCompleta, { ...reservaCompleta, id: 9 }]);
    chats.noLeidosPorPareja.mockResolvedValue(new Map([['7-3', 2]]));
    const { reservas } = await servicio.listarReservas({ id: 7, rol: 'usuario' });
    expect(chats.noLeidosPorPareja).toHaveBeenCalledWith({ id: 7, rol: 'usuario' });
    expect(reservas.map((r) => r.mensajesNoLeidos)).toEqual([2, 2]);
  });
});

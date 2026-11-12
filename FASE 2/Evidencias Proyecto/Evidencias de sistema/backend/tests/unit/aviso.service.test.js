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
    para: 'camila@example.test', nombre: 'Camila', asunto: 'FitSearch | Nueva solicitud de reserva', icono: 'solicitud',
    accion: expect.objectContaining({ texto: 'Revisar solicitud en mi agenda', ruta: '/profesional/agenda' }),
  }));
  // Estructura pedida por el PO (11-11-2026): quién pidió la hora, panel con el detalle y qué debe hacer el profesional.
  const aviso = correo.enviarAviso.mock.calls[0][0];
  expect(aviso.seccion.texto).toContain('**Ana Pérez** ha solicitado reservar una hora contigo');
  expect(aviso.detalles).toEqual([
    { icono: 'calendario', etiqueta: 'Fecha', valor: 'Martes 10 de noviembre' },
    { icono: 'reloj', etiqueta: 'Horario', valor: '09:00 a 10:00 (hora de Chile)' },
    { icono: 'video', etiqueta: 'Modalidad', valor: 'Online' },
    { icono: 'tipo', etiqueta: 'Tipo de atención', valor: 'Primera visita' },
    { icono: 'estado', etiqueta: 'Estado', valor: 'Pendiente de confirmación', estado: 'pendiente' },
  ]);
  expect(aviso.pasos.titulo).toBe('¿Qué debes hacer?');
  expect(aviso.nota).toMatch(/todavía no está confirmada/);
  correo.enviarAviso.mockClear();
  const sinAvisos = reserva();
  sinAvisos.disponibilidad.profesional.avisosCorreo = false;
  modelo.datosReserva.mockResolvedValue(sinAvisos);
  await avisos.reservaCreada(5);
  expect(correo.enviarAviso).not.toHaveBeenCalled();
});

test('si el profesional confirma automáticamente, el aviso dice que la reserva ya quedó confirmada', async () => {
  modelo.datosReserva.mockResolvedValue(reserva({ estado: 'confirmada', primeraVisita: false }));
  await avisos.reservaCreada(5);
  const aviso = correo.enviarAviso.mock.calls[0][0];
  expect(aviso).toMatchObject({ asunto: 'FitSearch | Nueva reserva confirmada', icono: 'confirmada' });
  expect(aviso.detalles).toEqual(expect.arrayContaining([
    { icono: 'tipo', etiqueta: 'Tipo de atención', valor: 'Ya se atendió contigo' },
    { icono: 'estado', etiqueta: 'Estado', valor: 'Confirmada', estado: 'confirmada' },
  ]));
});

test('confirmar avisa al usuario; si el usuario cancela, se avisa al profesional', async () => {
  modelo.datosReserva.mockResolvedValue(reserva({ estado: 'confirmada' }));
  await avisos.reservaCambiada(5);
  expect(correo.enviarAviso).toHaveBeenLastCalledWith(expect.objectContaining({ para: 'ana@example.test', asunto: 'FitSearch | Tu cita fue confirmada' }));
  expect(correo.enviarAviso.mock.lastCall[0].detalles[0]).toEqual({ icono: 'persona', etiqueta: 'Profesional', valor: 'Camila Rojas' });
  modelo.datosReserva.mockResolvedValue(reserva({ estado: 'cancelada', canceladaPor: 'usuario' }));
  await avisos.reservaCambiada(5);
  expect(correo.enviarAviso).toHaveBeenLastCalledWith(expect.objectContaining({ para: 'camila@example.test', asunto: 'FitSearch | Una reserva fue cancelada' }));
  modelo.datosReserva.mockResolvedValue(reserva({ estado: 'cancelada', canceladaPor: 'profesional' }));
  await avisos.reservaCambiada(5);
  expect(correo.enviarAviso).toHaveBeenLastCalledWith(expect.objectContaining({ para: 'ana@example.test', asunto: 'FitSearch | Tu cita fue cancelada' }));
  // Si el profesional cancela, el botón lleva a su ficha para elegir otra hora.
  expect(correo.enviarAviso.mock.lastCall[0].accion).toMatchObject({ texto: 'Buscar otra hora', ruta: '/profesionales/3' });
});

// Lunes 09-11-2026 a las 10:00 en Chile; la marca del intento va sin milisegundos (columnas DATETIME(0)).
const ahora = new Date('2026-11-09T13:00:00.750Z');
const marca = new Date('2026-11-09T13:00:00Z');

describe('lista de espera', () => {
  const lista = (filas) => modelo.listaEspera.mockResolvedValue({ profesional: { especialidad: 'Nutrición', usuario: { nombre: 'Camila Rojas' } }, filas });

  test('toma a cada persona antes de escribirle y la saca solo si el correo salió; si falla, sigue en la lista', async () => {
    lista([{ id: 1, usuario: persona('Ana', 'ana@example.test') }, { id: 2, usuario: persona('Luis', 'luis@example.test') }, { id: 3, usuario: { ...persona('Eva', 'eva@example.test'), activo: false } }]);
    modelo.tomarDeLaLista.mockResolvedValue(true);
    correo.enviarAviso.mockResolvedValueOnce().mockRejectedValueOnce(new Error('SMTP caído'));
    const espia = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(await avisos.horaLiberada(3, ahora)).toBe(1);
    espia.mockRestore();
    expect(modelo.listaEspera).toHaveBeenCalledWith(3, ahora);
    expect(modelo.tomarDeLaLista.mock.calls).toEqual([[1, marca, ahora], [2, marca, ahora], [3, marca, ahora]]);
    expect(correo.enviarAviso).toHaveBeenCalledTimes(2);
    expect(correo.enviarAviso.mock.calls[0][0]).toMatchObject({ asunto: 'FitSearch | Camila Rojas tiene horas disponibles', accion: { ruta: '/profesionales/3' } });
    expect(correo.enviarAviso.mock.calls[0][0].detalles).toContainEqual({ icono: 'especialidad', etiqueta: 'Especialidad', valor: 'Nutrición' });
    // Ana recibió el correo y Eva (cuenta desactivada) sale sin correo; a Luis le falló el envío: se suelta y sigue en la lista.
    expect(modelo.sacarDeLaLista.mock.calls).toEqual([[1, marca], [3, marca]]);
    expect(modelo.soltarDeLaLista.mock.calls).toEqual([[2, marca]]);
  });

  test('si otra publicación ya tomó a la persona, no le escribe de nuevo', async () => {
    lista([{ id: 1, usuario: persona('Ana', 'ana@example.test') }, { id: 2, usuario: persona('Luis', 'luis@example.test') }]);
    modelo.tomarDeLaLista.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    correo.enviarAviso.mockResolvedValue();
    expect(await avisos.horaLiberada(3, ahora)).toBe(1);
    expect(correo.enviarAviso).toHaveBeenCalledTimes(1);
    expect(correo.enviarAviso.mock.calls[0][0].para).toBe('luis@example.test');
    expect(modelo.sacarDeLaLista.mock.calls).toEqual([[2, marca]]);
  });
});

describe('recordatorio', () => {
  const cita = (id, fecha, hora) => ({ id, usuario: { nombre: 'Ana', correo: 'ana@example.test' },
    disponibilidad: { fecha: new Date(`${fecha}T00:00:00Z`), horaInicio: t(hora), horaFin: t('23:00'), profesional: { usuario: { nombre: 'Camila' } } } });
  const vencido = new Date('2026-11-09T12:45:00.750Z');

  test('envía uno por cita confirmada de las próximas 24 horas y lo marca enviado solo después de enviarlo', async () => {
    prisma.reserva.findMany.mockResolvedValue([cita(1, '2026-11-09', '09:00'), cita(2, '2026-11-09', '18:00'), cita(3, '2026-11-10', '09:30'), cita(4, '2026-11-10', '10:30')]);
    // La cita 2 se toma; la 3 ya la tomó otro proceso (count 0).
    prisma.reserva.updateMany.mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 0 });
    correo.enviarAviso.mockResolvedValue();
    expect(await recordatorios.enviarPendientes(ahora)).toBe(1);
    const [tomar, marcar, tomarOtra] = prisma.reserva.updateMany.mock.calls.map(([consulta]) => consulta);
    expect(tomar).toEqual({
      where: { id: 2, recordatorioEn: null, OR: [{ recordatorioIntento: null }, { recordatorioIntento: { lt: vencido } }] },
      data: { recordatorioIntento: marca },
    });
    expect(marcar).toEqual({ where: { id: 2, recordatorioIntento: marca }, data: { recordatorioEn: marca, recordatorioIntento: null } });
    expect(tomarOtra.where.id).toBe(3);
    expect(prisma.reserva.updateMany).toHaveBeenCalledTimes(3);
    expect(correo.enviarAviso).toHaveBeenCalledTimes(1);
    expect(correo.enviarAviso.mock.calls[0][0]).toMatchObject({ asunto: 'FitSearch | Recordatorio de tu cita', para: 'ana@example.test', icono: 'recordatorio' });
    // Las citas con un envío en curso no vencido no se vuelven a pedir.
    expect(prisma.reserva.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({
      estado: 'confirmada', recordatorioEn: null, OR: [{ recordatorioIntento: null }, { recordatorioIntento: { lt: vencido } }],
    }) }));
  });

  test('si el correo falla, suelta la cita sin marcarla enviada para que el próximo ciclo lo reintente', async () => {
    prisma.reserva.findMany.mockResolvedValue([cita(2, '2026-11-09', '18:00')]);
    prisma.reserva.updateMany.mockResolvedValue({ count: 1 });
    correo.enviarAviso.mockRejectedValue(new Error('SMTP caído'));
    const espia = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(await recordatorios.enviarPendientes(ahora)).toBe(0);
    espia.mockRestore();
    const consultas = prisma.reserva.updateMany.mock.calls.map(([consulta]) => consulta);
    expect(consultas).toHaveLength(2);
    expect(consultas[1]).toEqual({ where: { id: 2, recordatorioIntento: marca }, data: { recordatorioIntento: null } });
    expect(consultas.some((c) => c.data.recordatorioEn)).toBe(false);
  });
});

test('la marca de un envío en curso va sin milisegundos y vence a los 15 minutos', () => {
  const intento = require('../../src/utils/intentoDeEnvio');
  expect(intento.marcaDe(ahora)).toEqual(marca);
  expect(intento.libre('avisoIntento', ahora)).toEqual({ OR: [{ avisoIntento: null }, { avisoIntento: { lt: vencido15(ahora) } }] });
});
function vencido15(fecha) { return new Date(fecha.getTime() - 15 * 60000); }

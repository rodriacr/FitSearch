// Chat entre usuario y profesional (FS-HU-31; decisión del PO del 09-11-2026): uno por pareja con todo su historial,
// solo para sus dos participantes, disponible aunque una reserva se cancele y con borrado solo para quien lo pide.
jest.mock('../../src/models/chat.model');
const modelo = require('../../src/models/chat.model');
const servicio = require('../../src/services/chat.service');

const t = (hora) => new Date(`1970-01-01T${hora}:00Z`);
const chat = (sobrescribir = {}) => ({
  id: 3, usuarioId: 7, profesionalId: 4, borradoUsuarioHasta: 0, borradoUsuarioEn: null, borradoProfesionalHasta: 0, borradoProfesionalEn: null,
  fechaCreacion: new Date('2026-11-01T12:00:00Z'), usuario: { id: 7, nombre: 'Ana Pérez' },
  profesional: { id: 4, usuarioId: 30, especialidad: 'Nutrición', usuario: { nombre: 'Camila Rojas' } },
  ...sobrescribir,
});
const mensaje = (id, autorId, texto, fecha = '2026-11-09T12:00:00Z') => ({ id, autorId, texto, leido: false, fechaCreacion: new Date(fecha) });
const reserva = (id, estado, creada) => ({
  id, estado, mensaje: `Mensaje de la reserva ${id}`, fechaCreacion: new Date(creada),
  disponibilidad: { fecha: new Date('2026-11-12T00:00:00Z'), horaInicio: t('09:00'), horaFin: t('10:00') },
});
const usuario = { id: 7, rol: 'usuario' };
const profesional = { id: 30, rol: 'profesional' };
beforeEach(() => jest.resetAllMocks());

test('un solo chat por pareja: el historial reúne los mensajes y los avisos de todas sus reservas', async () => {
  modelo.buscar.mockResolvedValue(chat());
  modelo.mensajes.mockResolvedValue([mensaje(1, 7, 'Hola'), mensaje(2, 30, 'Hola Ana')]);
  modelo.reservasDePareja.mockResolvedValue([reserva(40, 'cancelada', '2026-10-20T12:00:00Z'), reserva(42, 'pendiente', '2026-10-30T12:00:00Z')]);
  const r = await servicio.abrir(profesional, 3);
  expect(modelo.marcarLeidos).toHaveBeenCalledWith(3, 30);
  expect(r.chat.con).toEqual({ nombre: 'Ana Pérez', detalle: 'Cliente', clienteId: 7 });
  expect(r.chat.reservas.map((x) => [x.id, x.estado])).toEqual([[40, 'cancelada'], [42, 'pendiente']]);
  expect(r.mensajes.map((m) => [m.texto, m.propio])).toEqual([['Hola', false], ['Hola Ana', true]]);
});

test('la reserva cancelada no cierra el chat: se puede seguir escribiendo', async () => {
  modelo.buscar.mockResolvedValue(chat());
  modelo.crearMensaje.mockResolvedValue(mensaje(5, 7, 'Quiero reagendar'));
  expect((await servicio.enviar(usuario, 3, '  Quiero reagendar  ')).mensaje).toMatchObject({ texto: 'Quiero reagendar', propio: true });
  expect(modelo.crearMensaje).toHaveBeenCalledWith(3, 7, 'Quiero reagendar');
  await expect(servicio.enviar(usuario, 3, '   ')).rejects.toMatchObject({ estado: 400 });
  await expect(servicio.enviar(usuario, 3, 'a'.repeat(1001))).rejects.toMatchObject({ estado: 400 });
});

test('quien no participa recibe «no existe», aunque sea profesional o el mismo id con otro rol', async () => {
  modelo.buscar.mockResolvedValue(chat());
  await expect(servicio.abrir({ id: 8, rol: 'usuario' }, 3)).rejects.toMatchObject({ estado: 404 });
  await expect(servicio.abrir({ id: 31, rol: 'profesional' }, 3)).rejects.toMatchObject({ estado: 404 });
  await expect(servicio.enviar({ id: 7, rol: 'profesional' }, 3, 'Hola')).rejects.toMatchObject({ estado: 404 });
  await expect(servicio.eliminar({ id: 8, rol: 'usuario' }, 3)).rejects.toMatchObject({ estado: 404 });
  modelo.buscar.mockResolvedValue(null);
  await expect(servicio.abrir(usuario, 99)).rejects.toMatchObject({ estado: 404 });
  expect(modelo.marcarLeidos).not.toHaveBeenCalled();
  expect(modelo.eliminarPara).not.toHaveBeenCalled();
});

test('eliminar borra el chat solo para quien lo pide; después solo ve lo nuevo', async () => {
  modelo.buscar.mockResolvedValue(chat());
  await servicio.eliminar(profesional, 3);
  expect(modelo.eliminarPara).toHaveBeenCalledWith(3, 'profesional');
  // El profesional lo eliminó hasta el mensaje 2: solo ve lo posterior y las reservas nuevas.
  const borrado = new Date('2026-11-09T13:00:00Z');
  modelo.buscar.mockResolvedValue(chat({ borradoProfesionalHasta: 2, borradoProfesionalEn: borrado }));
  modelo.mensajes.mockResolvedValue([mensaje(3, 7, '¿Sigue en pie mi hora?')]);
  modelo.reservasDePareja.mockResolvedValue([]);
  const r = await servicio.abrir(profesional, 3);
  expect(modelo.mensajes).toHaveBeenCalledWith(3, 2);
  expect(modelo.reservasDePareja).toHaveBeenCalledWith(7, 4, borrado);
  expect(r.mensajes).toHaveLength(1);
  // El usuario no lo eliminó: sigue viendo todo.
  modelo.mensajes.mockClear();
  await servicio.abrir(usuario, 3);
  expect(modelo.mensajes).toHaveBeenCalledWith(3, 0);
});

test('la lista tiene un chat por pareja, oculta los eliminados sin novedades y ordena por la última actividad', async () => {
  const borrado = new Date('2026-11-05T12:00:00Z');
  modelo.chatsDe.mockResolvedValue([
    chat({ id: 3 }),
    chat({ id: 4, profesionalId: 5, borradoUsuarioHasta: 9, borradoUsuarioEn: borrado, profesional: { id: 5, usuarioId: 31, especialidad: 'Kinesiología', usuario: { nombre: 'Diego Soto' } } }),
    chat({ id: 6, profesionalId: 6, profesional: { id: 6, usuarioId: 32, especialidad: 'Psicología deportiva', usuario: { nombre: 'Eva Ruiz' } } }),
  ]);
  modelo.ultimoMensaje.mockImplementation(async (id) => ({ 3: mensaje(2, 30, 'Te espero', '2026-11-08T10:00:00Z'), 4: null, 6: null }[id]));
  modelo.noLeidos.mockImplementation(async (id) => (id === 3 ? 1 : 0));
  modelo.reservasDePareja.mockImplementation(async (_u, p) => (p === 6 ? [reserva(50, 'confirmada', '2026-11-09T09:00:00Z')] : []));
  const { chats } = await servicio.listar(usuario);
  expect(chats.map((c) => c.id)).toEqual([6, 3]);
  expect(chats[1]).toMatchObject({ noLeidos: 1, con: { nombre: 'Camila Rojas', profesionalId: 4 }, ultimo: { texto: 'Te espero', propio: false } });
  expect(chats[0]).toMatchObject({ ultimo: null, ultimaCita: { fecha: '2026-11-12', horaInicio: '09:00', estado: 'confirmada' } });
});

test('desde una reserva se abre el chat de esa pareja; una reserva ajena no existe', async () => {
  modelo.participantesDeReserva.mockResolvedValue({ usuarioId: 7, disponibilidad: { profesional: { id: 4, usuarioId: 30 } } });
  modelo.obtenerOCrear.mockResolvedValue({ id: 3 });
  expect(await servicio.deReserva(usuario, 42)).toEqual({ id: 3 });
  expect(await servicio.deReserva(profesional, 42)).toEqual({ id: 3 });
  expect(modelo.obtenerOCrear).toHaveBeenCalledWith(7, 4);
  await expect(servicio.deReserva({ id: 8, rol: 'usuario' }, 42)).rejects.toMatchObject({ estado: 404 });
  modelo.participantesDeReserva.mockResolvedValue(null);
  await expect(servicio.deReserva(usuario, 99)).rejects.toMatchObject({ estado: 404 });
});

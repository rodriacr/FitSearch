// Rutas de las mejoras del 09-11-2026: agenda semanal, horarios en serie, fechas bloqueadas, lista de espera, experiencia y
// configuración (FS-HU-29) y el chat entre usuario y profesional (FS-HU-31); clientes y reportes (FS-HU-27 y FS-HU-28) se prueban
// en actividadProfesional.api.test.js (PR #50). Los servicios
// se simulan: aquí se prueban la sesión, los roles, las validaciones y que solo lleguen los datos permitidos.
jest.mock('../../src/services/agenda.service');
jest.mock('../../src/services/listaEspera.service');
jest.mock('../../src/services/cuentaProfesional.service');
jest.mock('../../src/services/chat.service');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../src/app');
const agenda = require('../../src/services/agenda.service');
const listaEspera = require('../../src/services/listaEspera.service');
const cuenta = require('../../src/services/cuentaProfesional.service');
const chats = require('../../src/services/chat.service');

const token = (rol) => jwt.sign({ rol }, process.env.JWT_SECRET, { subject: '7' });
const api = (rol, metodo, ruta, cuerpo) => request(app)[metodo](`/api${ruta}`).set('Authorization', `Bearer ${token(rol)}`).send(cuerpo);
beforeEach(() => jest.resetAllMocks());

describe('agenda semanal, serie y bloqueos', () => {
  test('solo el profesional ve su semana, publica en serie y bloquea fechas', async () => {
    expect((await request(app).get('/api/agenda/semana')).status).toBe(401);
    for (const [metodo, ruta] of [['get', '/agenda/semana'], ['post', '/disponibilidades/serie'], ['get', '/agenda/bloqueos'], ['post', '/agenda/bloqueos'], ['delete', '/agenda/bloqueos/1']]) {
      expect((await api('usuario', metodo, ruta, {})).status).toBe(403);
    }
  });

  test('pasa la fecha pedida a la semana y la duración como número a la serie', async () => {
    agenda.semana.mockResolvedValue({ horarios: [] });
    expect((await api('profesional', 'get', '/agenda/semana?desde=2026-11-09')).status).toBe(200);
    expect(agenda.semana).toHaveBeenCalledWith(7, '2026-11-09');
    agenda.guardarSerie.mockResolvedValue({ horarios: [], omitidos: [] });
    const res = await api('profesional', 'post', '/disponibilidades/serie', { fecha: '2026-11-10', horaInicio: '09:00', horaFin: '12:00', duracion: '45', profesionalId: 99 });
    expect(res.status).toBe(201);
    expect(agenda.guardarSerie).toHaveBeenCalledWith(7, { fecha: '2026-11-10', horaInicio: '09:00', horaFin: '12:00', duracion: 45 });
    expect((await api('profesional', 'post', '/disponibilidades/serie', { fecha: '2026-11-10', horaInicio: '09:00', horaFin: '12:00' })).status).toBe(400);
  });

  test('crea y quita bloqueos solo con sus campos', async () => {
    agenda.crearBloqueo.mockResolvedValue({ bloqueo: { id: 1 } });
    expect((await api('profesional', 'post', '/agenda/bloqueos', { fechaInicio: '2026-12-20', fechaFin: '2026-12-31', motivo: 'Vacaciones', profesionalId: 2 })).status).toBe(201);
    expect(agenda.crearBloqueo).toHaveBeenCalledWith(7, { fechaInicio: '2026-12-20', fechaFin: '2026-12-31', motivo: 'Vacaciones' });
    agenda.eliminarBloqueo.mockResolvedValue({ id: 1 });
    expect((await api('profesional', 'delete', '/agenda/bloqueos/1')).status).toBe(200);
    expect(agenda.eliminarBloqueo).toHaveBeenCalledWith(7, 1);
    expect((await api('profesional', 'delete', '/agenda/bloqueos/abc')).status).toBe(400);
  });

  test('la reserva acepta modalidad y primera visita y rechaza una primera visita que no es sí o no', async () => {
    agenda.crearReserva.mockResolvedValue({ reserva: { id: 1 } });
    const res = await api('usuario', 'post', '/reservas', { disponibilidadId: 1, mensaje: 'Necesito una evaluación', modalidad: 'online', primeraVisita: false });
    expect(res.status).toBe(201);
    expect(agenda.crearReserva).toHaveBeenCalledWith(7, { disponibilidadId: 1, mensaje: 'Necesito una evaluación', modalidad: 'online', primeraVisita: false });
    expect((await api('usuario', 'post', '/reservas', { disponibilidadId: 1, mensaje: 'Necesito una evaluación', primeraVisita: 'quizás' })).status).toBe(400);
  });
});

describe('lista de espera', () => {
  test('solo una cuenta de usuario se anota, consulta o sale', async () => {
    listaEspera.anotar.mockResolvedValue({ enLista: true });
    listaEspera.estado.mockResolvedValue({ enLista: true });
    listaEspera.salir.mockResolvedValue({ enLista: false });
    expect((await api('usuario', 'post', '/profesionales/3/lista-espera')).status).toBe(201);
    expect(listaEspera.anotar).toHaveBeenCalledWith(3, 7);
    expect((await api('usuario', 'get', '/profesionales/3/lista-espera')).body).toEqual({ enLista: true });
    expect((await api('usuario', 'delete', '/profesionales/3/lista-espera')).body).toEqual({ enLista: false });
    expect((await api('profesional', 'post', '/profesionales/3/lista-espera')).status).toBe(403);
    expect((await api('usuario', 'post', '/profesionales/abc/lista-espera')).status).toBe(400);
  });
});

describe('experiencia y configuración (FS-HU-29)', () => {
  test('solo el profesional lee y guarda su experiencia y su configuración', async () => {
    cuenta.obtenerExperiencia.mockResolvedValue({ experiencia: { aniosExperiencia: 5 } });
    cuenta.guardarConfiguracion.mockResolvedValue({ configuracion: { autoconfirmar: true } });
    expect((await api('profesional', 'get', '/profesionales/mi-ficha/experiencia')).body).toEqual({ experiencia: { aniosExperiencia: 5 } });
    expect((await api('profesional', 'put', '/profesionales/mi-ficha/configuracion', { autoconfirmar: true })).status).toBe(200);
    expect(cuenta.guardarConfiguracion).toHaveBeenCalledWith(7, { autoconfirmar: true });
    expect((await api('usuario', 'get', '/profesionales/mi-ficha/experiencia')).status).toBe(403);
    expect((await api('usuario', 'put', '/profesionales/mi-ficha/configuracion', {})).status).toBe(403);
  });
});

describe('chat entre usuario y profesional (FS-HU-31)', () => {
  test('el usuario y el profesional listan, abren, escriben y eliminan; otras cuentas no', async () => {
    chats.listar.mockResolvedValue({ chats: [] });
    chats.noLeidos.mockResolvedValue({ total: 3 });
    chats.deReserva.mockResolvedValue({ id: 2 });
    chats.abrir.mockResolvedValue({ chat: { id: 2 }, mensajes: [] });
    chats.enviar.mockResolvedValue({ mensaje: { id: 1 } });
    chats.eliminar.mockResolvedValue({ id: 2 });
    expect((await api('usuario', 'get', '/chats')).status).toBe(200);
    expect((await api('profesional', 'get', '/chats/no-leidos')).body).toEqual({ total: 3 });
    expect((await api('usuario', 'post', '/chats', { reservaId: '5' })).body).toEqual({ id: 2 });
    expect(chats.deReserva).toHaveBeenCalledWith(expect.objectContaining({ id: 7, rol: 'usuario' }), 5);
    expect((await api('usuario', 'post', '/chats', { reservaId: 'cinco' })).status).toBe(400);
    expect((await api('usuario', 'get', '/chats/2')).status).toBe(200);
    expect(chats.abrir).toHaveBeenCalledWith(expect.objectContaining({ id: 7, rol: 'usuario' }), 2);
    expect((await api('profesional', 'post', '/chats/2/mensajes', { texto: 'Hola' })).status).toBe(201);
    expect(chats.enviar).toHaveBeenCalledWith(expect.objectContaining({ id: 7, rol: 'profesional' }), 2, 'Hola');
    expect((await api('usuario', 'post', '/chats/2/mensajes', {})).status).toBe(400);
    expect((await api('profesional', 'delete', '/chats/2')).body).toEqual({ id: 2 });
    expect(chats.eliminar).toHaveBeenCalledWith(expect.objectContaining({ id: 7, rol: 'profesional' }), 2);
    expect((await api('usuario', 'get', '/chats/0')).status).toBe(400);
    expect((await api('administrador', 'get', '/chats')).status).toBe(403);
    expect((await request(app).get('/api/chats')).status).toBe(401);
    // Las rutas antiguas por reserva ya no existen.
    expect((await api('usuario', 'get', '/reservas/5/mensajes')).status).toBe(404);
  });
});

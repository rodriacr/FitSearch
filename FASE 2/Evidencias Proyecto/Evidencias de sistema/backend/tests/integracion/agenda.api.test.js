jest.mock('../../src/services/agenda.service');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../src/app');
const servicio = require('../../src/services/agenda.service');
const token = (rol) =>
  jwt.sign({ rol }, process.env.JWT_SECRET, { subject: '7' });
const api = (rol, metodo, ruta, cuerpo) => {
  const peticion = request(app)[metodo](`/api${ruta}`);
  return peticion
    .set('Authorization', `Bearer ${token(rol)}`)
    .send(cuerpo);
};
beforeEach(() => jest.resetAllMocks());
test('la agenda exige sesión y rol profesional; reservar exige usuario', async () => {
  expect((await request(app).get('/api/disponibilidades')).status).toBe(401);
  expect((await api('usuario', 'post', '/disponibilidades', {})).status).toBe(
    403,
  );
  expect((await api('profesional', 'post', '/reservas', {})).status).toBe(403);
  expect((await api('administrador', 'get', '/reservas')).status).toBe(403);
});
test('escribe únicamente los campos del horario y usa la cuenta autenticada', async () => {
  servicio.guardarDisponibilidad.mockResolvedValue({ horario: { id: 4 } });
  const res = await api('profesional', 'post', '/disponibilidades', {
    fecha: '2026-10-12',
    horaInicio: '09:00',
    horaFin: '10:00',
    profesionalId: 99,
  });
  expect(res.status).toBe(201);
  expect(servicio.guardarDisponibilidad).toHaveBeenCalledWith(7, null, {
    fecha: '2026-10-12',
    horaInicio: '09:00',
    horaFin: '10:00',
  });
});
test('reserva por ID de bloque y rechaza IDs inválidos antes del servicio', async () => {
  servicio.crearReserva.mockResolvedValue({ reserva: { id: 1 } });
  expect(
    (
      await api('usuario', 'post', '/reservas', {
        disponibilidadId: 1,
        mensaje: 'Necesito una evaluación',
        usuarioId: 99,
      })
    ).status,
  ).toBe(201);
  expect(servicio.crearReserva).toHaveBeenCalledWith(7, {
    disponibilidadId: 1,
    mensaje: 'Necesito una evaluación',
  });
  expect(
    (await api('usuario', 'patch', '/reservas/abc', { estado: 'cancelada' }))
      .status,
  ).toBe(400);
});

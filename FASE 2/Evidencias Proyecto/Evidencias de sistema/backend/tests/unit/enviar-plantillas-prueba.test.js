// Muestras de los correos (npm run smtp:plantillas): se arman con el código real de los avisos, sin base de datos ni envío.
jest.mock('../../src/models/aviso.model', () => ({
  datosReserva: jest.fn(), listaEspera: jest.fn(), tomarDeLaLista: jest.fn(), sacarDeLaLista: jest.fn(), soltarDeLaLista: jest.fn(),
}));
jest.mock('nodemailer', () => ({ createTransport: jest.fn() }));
const nodemailer = require('nodemailer');
const modelo = require('../../src/models/aviso.model');
const correo = require('../../src/services/correo.service');
const { armar } = require('../../scripts/enviar-plantillas-prueba');

test('arma una muestra de cada correo, todas para el mismo buzón, sin enviar nada', async () => {
  const originales = { ...modelo };
  const { enviarAviso, enviarRecuperacion } = correo;
  const correos = await armar('fitsearchoficial@gmail.com');

  expect(correos.map((c) => c.asunto)).toEqual([
    'FitSearch | Restablece tu contraseña',
    'FitSearch | Nueva solicitud de reserva',
    'FitSearch | Nueva reserva confirmada',
    'FitSearch | Tu cita fue confirmada',
    'FitSearch | Tu cita fue cancelada',
    'FitSearch | Una reserva fue cancelada',
    'FitSearch | Daniela Soto tiene horas disponibles',
    'FitSearch | Recordatorio de tu cita',
  ]);
  expect(new Set(correos.map((c) => c.para))).toEqual(new Set(['fitsearchoficial@gmail.com']));
  correos.forEach((c) => {
    expect(c.html).toContain('<!doctype html>');
    expect(c.texto).toMatch(/^¡Hola, \S+!/);
    expect(c.adjuntos.length).toBeGreaterThanOrEqual(3);
  });
  // El enlace de recuperación es de muestra: no sirve para cambiar ninguna contraseña.
  expect(correos[0].texto).toContain('token=enlace-de-muestra-sin-validez');
  expect(nodemailer.createTransport).not.toHaveBeenCalled();
  // Deja el servicio de correo y el modelo como estaban.
  expect(correo.enviarAviso).toBe(enviarAviso);
  expect(correo.enviarRecuperacion).toBe(enviarRecuperacion);
  expect({ ...modelo }).toEqual(originales);
  expect(modelo.datosReserva).not.toHaveBeenCalled();
});

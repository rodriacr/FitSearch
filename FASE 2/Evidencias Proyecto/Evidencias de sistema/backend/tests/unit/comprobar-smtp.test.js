jest.mock('nodemailer', () => ({ createTransport: jest.fn() }));
jest.mock('../../src/config/env', () => ({ smtp: { host:'test', puerto:465, usuario:'test', contrasena:'test', remitente:'test@example.test' } }));
jest.mock('../../src/services/correo.service', () => ({ smtpConfigurado: () => true }));
const nodemailer = require('nodemailer');

test('explica el permiso de envío faltante y cierra el transporte', async () => {
  const anterior = process.argv;
  const error = jest.spyOn(console,'error').mockImplementation(() => {});
  const log = jest.spyOn(console,'log').mockImplementation(() => {});
  const close = jest.fn();
  const sendMail = jest.fn();
  nodemailer.createTransport.mockReturnValue({ verify:async()=>{}, close, sendMail });
  process.argv=['node','comprobar-smtp.js','--destinatario','prueba@example.test'];
  try {
    jest.isolateModules(() => require('../../scripts/comprobar-smtp'));
    await new Promise(setImmediate);
    expect(error).toHaveBeenCalledWith('Confirma el envío con --enviar-prueba y un destinatario válido');
    // Un error de uso no debe sugerir que la cuenta o su contraseña están mal.
    expect(error).not.toHaveBeenCalledWith(expect.stringContaining('contraseña de aplicación'));
    expect(sendMail).not.toHaveBeenCalled();
    expect(close).toHaveBeenCalled();
    expect(process.exitCode).toBe(1);
  } finally { process.argv=anterior; process.exitCode=0; error.mockRestore(); log.mockRestore(); }
});

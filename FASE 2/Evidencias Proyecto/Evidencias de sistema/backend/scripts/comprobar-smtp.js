const nodemailer = require('nodemailer');
const config = require('../src/config/env');
const { smtpConfigurado } = require('../src/services/correo.service');

async function comprobar() {
  if (!smtpConfigurado()) {
    console.error(
      'SMTP pendiente: configura SMTP_USUARIO y SMTP_CONTRASENA en backend/.env. No se envió ningún correo.',
    );
    process.exitCode = 2;
    return;
  }
  const { host, puerto, usuario, contrasena, remitente } = config.smtp;
  const transporte = nodemailer.createTransport({
    host,
    port: puerto,
    secure: puerto === 465,
    auth: { user: usuario, pass: contrasena },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000,
  });
  try {
    await transporte.verify();
    console.log('Conexión y autenticación SMTP comprobadas.');
    const posicion = process.argv.indexOf('--destinatario');
    if (posicion >= 0) {
      const para = process.argv[posicion + 1];
      if (
        !para ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(para) ||
        !process.argv.includes('--enviar-prueba')
      )
        throw new Error(
          'Confirma el envío con --enviar-prueba y un destinatario válido',
        );
      await transporte.sendMail({
        from: remitente,
        to: para,
        subject: 'Prueba de correo de FitSearch',
        text: 'Esta prueba confirma la configuración de correo de FitSearch. No contiene contraseñas, códigos ni enlaces de recuperación.',
      });
      console.log(
        'Correo de prueba enviado. Comprueba su recepción en el buzón autorizado.',
      );
    }
  } finally {
    transporte.close();
  }
}
comprobar().catch((error) => {
  // Códigos del proveedor ayudan a diagnosticar sin publicar datos de autenticación.
  const diagnostico = error.message?.startsWith('Confirma el envío')
    ? error.message
    : `Error SMTP: ${error.code || 'sin código'}${error.responseCode ? ` (${error.responseCode})` : ''}`;
  console.error(diagnostico);
  console.error(
    'No se pudo completar la comprobación SMTP. Revisa la cuenta, su contraseña de aplicación y la conexión; no publiques credenciales.',
  );
  process.exitCode = 1;
});

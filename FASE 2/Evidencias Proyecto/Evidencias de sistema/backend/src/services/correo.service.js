// Envío de correos por SMTP con Nodemailer (DAS, D14).
// Si las credenciales no están configuradas, el contenido se muestra en la consola para poder probar el flujo en desarrollo.
const nodemailer = require('nodemailer');
const config = require('../config/env');

function smtpConfigurado() {
  const { usuario, contrasena } = config.smtp;
  return Boolean(usuario && contrasena && contrasena !== 'CAMBIAR');
}

let transporte;
function obtenerTransporte() {
  if (!transporte) {
    const { host, puerto, usuario, contrasena } = config.smtp;
    transporte = nodemailer.createTransport({
      host,
      port: puerto,
      secure: puerto === 465,
      auth: { user: usuario, pass: contrasena },
    });
  }
  return transporte;
}

async function enviarRecuperacion({ para, nombre, enlace, minutos }) {
  const asunto = 'Restablece tu contraseña de FitSearch';
  const texto = `Hola ${nombre}:\n\nRecibimos una solicitud para restablecer tu contraseña de FitSearch. `
    + `Abre este enlace para crear una nueva (vence en ${minutos} minutos y sirve una sola vez):\n\n${enlace}\n\n`
    + 'Si no fuiste tú, ignora este correo: tu contraseña no cambiará.';

  if (!smtpConfigurado()) {
    console.info(`[correo sin SMTP configurado] Para: ${para}\nAsunto: ${asunto}\nEnlace de recuperación: ${enlace}`);
    return;
  }

  const html = `<div style="font-family:Arial,sans-serif;color:#1c2b39;max-width:520px">
    <h2 style="color:#0b4f80">Restablece tu contraseña</h2>
    <p>Hola ${nombre.replace(/[<>&"]/g, '')}:</p>
    <p>Recibimos una solicitud para restablecer tu contraseña de FitSearch. El enlace vence en ${minutos} minutos y sirve una sola vez.</p>
    <p><a href="${enlace}" style="display:inline-block;background:#f47b20;color:#fff;padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:bold">Crear nueva contraseña</a></p>
    <p style="color:#5f6f80;font-size:13px">Si no fuiste tú, ignora este correo: tu contraseña no cambiará.</p>
  </div>`;
  await obtenerTransporte().sendMail({ from: config.smtp.remitente, to: para, subject: asunto, text: texto, html });
}

module.exports = { enviarRecuperacion, smtpConfigurado };

// Envío de correos por SMTP con Nodemailer (DAS, D14).
// Si las credenciales no están configuradas, el contenido se muestra en la consola para poder probar el flujo en desarrollo.
const nodemailer = require('nodemailer');
const config = require('../config/env');

function smtpConfigurado() {
  const { usuario, contrasena } = config.smtp;
  return Boolean(usuario && contrasena && contrasena !== 'CAMBIAR');
}

// Qué falta para que los correos salgan de verdad (11-11-2026). server.js lo avisa al arrancar: antes, sin SMTP_USUARIO o
// con la contraseña de ejemplo, ningún correo salía y no había ninguna señal fuera de la consola de cada envío.
function faltantesSmtp() {
  const { usuario, contrasena } = config.smtp;
  return [!usuario && 'SMTP_USUARIO', (!contrasena || contrasena === 'CAMBIAR') && 'SMTP_CONTRASENA'].filter(Boolean);
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

const escapar = (texto) => String(texto).replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));

// Avisos de la agenda (reserva nueva, confirmada o cancelada, hora liberada, recordatorio y mensaje nuevo). El texto va
// en párrafos y, si corresponde, con un botón que abre la pantalla de FitSearch donde se resuelve.
async function enviarAviso({ para, nombre, asunto, parrafos, accion }) {
  const enlace = accion && `${config.urlFrontend}${accion.ruta}`;
  const texto = [`Hola ${nombre}:`, ...parrafos, ...(enlace ? [`${accion.texto}: ${enlace}`] : [])].join('\n\n');
  if (!smtpConfigurado()) {
    console.info(`[correo sin SMTP configurado] Para: ${para}\nAsunto: ${asunto}\n${texto}`);
    return;
  }
  const html = `<div style="font-family:Arial,sans-serif;color:#1c2b39;max-width:520px">
    <h2 style="color:#0b4f80">${escapar(asunto)}</h2>
    <p>Hola ${escapar(nombre)}:</p>
    ${parrafos.map((parrafo) => `<p>${escapar(parrafo)}</p>`).join('\n    ')}
    ${enlace ? `<p><a href="${enlace}" style="display:inline-block;background:#c9500a;color:#fff;padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:bold">${escapar(accion.texto)}</a></p>` : ''}
    <p style="color:#5f6f80;font-size:13px">Recibes este aviso porque tienes una cuenta en FitSearch.</p>
  </div>`;
  await obtenerTransporte().sendMail({ from: config.smtp.remitente, to: para, subject: asunto, text: texto, html });
}

module.exports = { enviarRecuperacion, enviarAviso, smtpConfigurado, faltantesSmtp };

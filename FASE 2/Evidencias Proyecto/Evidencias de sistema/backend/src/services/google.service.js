// Validación de los tokens de identidad de Google usados por "Continuar con Google" (FS-HU-16; DAS, D15).
const { OAuth2Client } = require('google-auth-library');
const config = require('../config/env');
const ErrorHttp = require('../utils/ErrorHttp');

const MENSAJE_NO_CONFIGURADO = 'El inicio de sesión con Google no está disponible en este momento';
const MENSAJE_CREDENCIAL = 'No fue posible validar tu cuenta de Google. Intenta nuevamente';
const MENSAJE_CORREO = 'Tu cuenta de Google no tiene un correo verificado, así que no podemos usarla para ingresar';

// El cliente se crea una sola vez: mantiene en caché las llaves públicas con las que Google firma los tokens.
const cliente = config.googleClientId ? new OAuth2Client(config.googleClientId) : null;

const configurado = () => Boolean(cliente);

// Devuelve los datos de la cuenta solo si el token fue emitido por Google para esta aplicación y no ha vencido.
async function verificarCredencial(credencial) {
  if (!cliente) throw new ErrorHttp(503, MENSAJE_NO_CONFIGURADO);

  let datos;
  try {
    const ticket = await cliente.verifyIdToken({ idToken: credencial, audience: config.googleClientId });
    datos = ticket.getPayload();
  } catch {
    // Firma inválida, token vencido o emitido para otro ID de cliente: nunca se debe confiar en él.
    throw new ErrorHttp(401, MENSAJE_CREDENCIAL);
  }

  // Sin correo verificado por Google cualquiera podría reclamar la cuenta de otra persona.
  if (!datos?.email || datos.email_verified !== true) throw new ErrorHttp(401, MENSAJE_CORREO);

  return {
    googleId: datos.sub,
    correo: datos.email.toLowerCase(),
    // Google no siempre entrega el nombre; en ese caso se usa la parte inicial del correo.
    nombre: (datos.name || '').trim() || datos.email.split('@')[0],
  };
}

module.exports = { configurado, verificarCredencial, MENSAJE_NO_CONFIGURADO, MENSAJE_CREDENCIAL, MENSAJE_CORREO };

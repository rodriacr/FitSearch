// Carga y valida las variables de entorno necesarias para la API.
require('dotenv').config({ quiet: true });

const obligatorias = ['DATABASE_URL', 'JWT_SECRET'];
const faltantes = obligatorias.filter((nombre) => !process.env[nombre]);
if (faltantes.length > 0) {
  throw new Error(`Faltan variables de entorno obligatorias: ${faltantes.join(', ')}. Revisa backend/.env (ver .env.example).`);
}

module.exports = {
  puerto: Number(process.env.PORT) || 3000,
  jwtSecreto: process.env.JWT_SECRET,
  jwtExpiracion: process.env.JWT_EXPIRES_IN || '8h',
  // Duración de la sesión cuando el usuario marca "Recordarme" (DAS, D17).
  jwtExpiracionRecordar: process.env.JWT_REMEMBER_EXPIRES_IN || '30d',
  bcryptCosto: Number(process.env.BCRYPT_COST) || 10,
  // Dirección del frontend usada para armar el enlace de recuperación de contraseña.
  urlFrontend: (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, ''),
  recuperacionMinutos: Number(process.env.RECOVERY_TOKEN_MINUTES) || 60,
  // ID de cliente OAuth de Google (FS-HU-16). No es secreto, pero sin él el botón de Google queda desactivado.
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  // Envío de correos por SMTP (DAS, D14). Si faltan datos, el enlace se muestra en la consola del backend.
  smtp: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    puerto: Number(process.env.SMTP_PORT) || 465,
    usuario: process.env.SMTP_USUARIO || '',
    contrasena: process.env.SMTP_CONTRASENA || '',
    remitente: process.env.SMTP_REMITENTE || process.env.SMTP_USUARIO || '',
  },
};

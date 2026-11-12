const config = require('./config/env');
const app = require('./app');
const prisma = require('./models/prisma');

const recordatorios = require('./services/recordatorio.service');
const { faltantesSmtp } = require('./services/correo.service');
const google = require('./services/google.service');

const servidor = app.listen(config.puerto, () => {
  console.log(`API de FitSearch escuchando en http://localhost:${config.puerto}/api`);
  // Avisa si el correo o Google no están configurados, para que no fallen en silencio (11-11-2026).
  const faltan = faltantesSmtp();
  if (faltan.length) {
    console.warn(`[correo] Sin configurar (${faltan.join(' y ')} en backend/.env): los correos de recuperación y los avisos solo se escriben en esta consola. Comprueba la cuenta con npm run smtp:comprobar.`);
  }
  if (!google.configurado()) console.warn('[google] Falta GOOGLE_CLIENT_ID en backend/.env: «Continuar con Google» responderá que no está disponible.');
  // Recordatorio por correo de las citas confirmadas de las próximas 24 horas (revisa cada 10 minutos).
  recordatorios.iniciar();
});

async function detener() {
  servidor.close();
  await prisma.$disconnect();
  process.exit(0);
}

process.on('SIGINT', detener);
process.on('SIGTERM', detener);

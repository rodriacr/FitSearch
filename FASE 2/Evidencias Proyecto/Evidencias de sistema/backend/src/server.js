const config = require('./config/env');
const app = require('./app');
const prisma = require('./models/prisma');

const recordatorios = require('./services/recordatorio.service');

const servidor = app.listen(config.puerto, () => {
  console.log(`API de FitSearch escuchando en http://localhost:${config.puerto}/api`);
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

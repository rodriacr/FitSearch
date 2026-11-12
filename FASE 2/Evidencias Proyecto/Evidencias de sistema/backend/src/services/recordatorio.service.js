// Recordatorio por correo de las citas confirmadas (mejora del 09-11-2026). Cada cierto tiempo el
// servidor busca las citas confirmadas que empiezan dentro de las próximas 24 horas, cuyo profesional mantiene activos los
// recordatorios (FS-HU-29), y envía uno solo por cita (reservas.recordatorio_enviado). Mientras se envía, la cita queda
// tomada (reservas.recordatorio_intento, ver utils/intentoDeEnvio.js): si el correo falla, se vuelve a intentar.
const prisma = require('../models/prisma');
const avisos = require('./aviso.service');
const intento = require('../utils/intentoDeEnvio');
const { fechaEnChile, horaEnChile, sumarDias } = require('../utils/fechaChile');
const { agenda: reglas } = require('../../../shared/reglas.json');

const INTERVALO_MINUTOS = 10;

// Citas por recordar: confirmadas, sin recordatorio ni un envío en curso, desde ahora hasta 24 horas después (hora de Chile).
async function pendientes(ahora) {
  const hoy = fechaEnChile(ahora);
  const limite = new Date(ahora.getTime() + reglas.recordatorioHorasAntes * 3600000);
  const candidatas = await prisma.reserva.findMany({
    where: {
      estado: 'confirmada',
      recordatorioEn: null,
      ...intento.libre('recordatorioIntento', ahora),
      usuario: { activo: true },
      disponibilidad: {
        fecha: { gte: new Date(`${hoy}T00:00:00Z`), lte: new Date(`${sumarDias(hoy, 2)}T00:00:00Z`) },
        profesional: { recordatorios: true },
      },
    },
    select: {
      id: true,
      modalidad: true,
      usuario: { select: { nombre: true, correo: true } },
      disponibilidad: {
        select: {
          fecha: true, horaInicio: true, horaFin: true,
          profesional: { select: { id: true, especialidad: true, usuario: { select: { nombre: true } } } },
        },
      },
    },
  });
  const desde = `${hoy}T${horaEnChile(ahora)}`;
  const hasta = `${fechaEnChile(limite)}T${horaEnChile(limite)}`;
  return candidatas.filter(({ disponibilidad: d }) => {
    const inicio = `${d.fecha.toISOString().slice(0, 10)}T${d.horaInicio.toISOString().slice(11, 16)}`;
    return inicio > desde && inicio <= hasta;
  });
}

// Cada cita se toma antes de enviar (si dos procesos coinciden, solo uno la gana) y queda como enviada solo si el correo
// salió. Si falla, se suelta y el próximo ciclo lo reintenta.
async function enviarPendientes(ahora = new Date()) {
  const marca = intento.marcaDe(ahora);
  let enviados = 0;
  for (const reserva of await pendientes(ahora)) {
    try {
      const { count } = await prisma.reserva.updateMany({
        where: { id: reserva.id, recordatorioEn: null, ...intento.libre('recordatorioIntento', ahora) },
        data: { recordatorioIntento: marca },
      });
      if (!count) continue;
      try {
        await avisos.recordatorio(reserva);
      } catch (error) {
        await prisma.reserva.updateMany({ where: { id: reserva.id, recordatorioIntento: marca }, data: { recordatorioIntento: null } });
        throw error;
      }
      await prisma.reserva.updateMany({ where: { id: reserva.id, recordatorioIntento: marca }, data: { recordatorioEn: marca, recordatorioIntento: null } });
      enviados += 1;
    } catch (error) {
      console.error(`[recordatorio] No se pudo enviar el recordatorio de la reserva ${reserva.id}: ${error.message}`);
    }
  }
  return enviados;
}

// Lo inicia server.js (no app.js: las pruebas de la API no programan tareas).
function iniciar() {
  const revisar = () => enviarPendientes().catch((error) => console.error(`[recordatorio] ${error.message}`));
  revisar();
  const temporizador = setInterval(revisar, INTERVALO_MINUTOS * 60000);
  temporizador.unref?.();
  return temporizador;
}

module.exports = { pendientes, enviarPendientes, iniciar, INTERVALO_MINUTOS };

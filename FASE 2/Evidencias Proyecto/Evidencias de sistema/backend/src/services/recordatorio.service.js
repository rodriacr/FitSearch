// Recordatorio por correo de las citas confirmadas (mejora del 09-11-2026). Cada cierto tiempo el
// servidor busca las citas confirmadas que empiezan dentro de las próximas 24 horas, cuyo profesional mantiene activos los
// recordatorios (FS-HU-29), y envía uno solo por cita (reservas.recordatorio_enviado).
const prisma = require('../models/prisma');
const avisos = require('./aviso.service');
const { fechaEnChile, horaEnChile, sumarDias } = require('../utils/fechaChile');
const { agenda: reglas } = require('../../../shared/reglas.json');

const INTERVALO_MINUTOS = 10;

// Citas por recordar: confirmadas, sin recordatorio, desde ahora hasta 24 horas después (hora de Chile).
async function pendientes(ahora) {
  const hoy = fechaEnChile(ahora);
  const limite = new Date(ahora.getTime() + reglas.recordatorioHorasAntes * 3600000);
  const candidatas = await prisma.reserva.findMany({
    where: {
      estado: 'confirmada',
      recordatorioEn: null,
      usuario: { activo: true },
      disponibilidad: {
        fecha: { gte: new Date(`${hoy}T00:00:00Z`), lte: new Date(`${sumarDias(hoy, 2)}T00:00:00Z`) },
        profesional: { recordatorios: true },
      },
    },
    select: {
      id: true,
      usuario: { select: { nombre: true, correo: true } },
      disponibilidad: {
        select: { fecha: true, horaInicio: true, horaFin: true, profesional: { select: { usuario: { select: { nombre: true } } } } },
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

async function enviarPendientes(ahora = new Date()) {
  let enviados = 0;
  for (const reserva of await pendientes(ahora)) {
    try {
      // Se marca antes de enviar: si dos procesos coinciden, solo uno gana la fila y nadie recibe dos correos.
      const { count } = await prisma.reserva.updateMany({ where: { id: reserva.id, recordatorioEn: null }, data: { recordatorioEn: ahora } });
      if (!count) continue;
      await avisos.recordatorio(reserva);
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

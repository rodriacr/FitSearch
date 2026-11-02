// Fecha y hora en Chile. Los días del límite del asistente (FS-HU-07) y de las comidas (FS-HU-10) se cortan a
// medianoche de Santiago, no en UTC.
const FORMATO = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Santiago', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
});

function partes(ahora) {
  return Object.fromEntries(FORMATO.formatToParts(ahora).map(({ type, value }) => [type, value]));
}

// Día de hoy en Chile ('AAAA-MM-DD').
function fechaEnChile(ahora = new Date()) {
  const p = partes(ahora);
  return `${p.year}-${p.month}-${p.day}`;
}

// Hora en Chile ('HH:MM').
function horaEnChile(ahora = new Date()) {
  const p = partes(ahora);
  return `${p.hour}:${p.minute}`;
}

// Suma días a una fecha 'AAAA-MM-DD' sin depender de la zona horaria del servidor.
function sumarDias(fecha, dias) {
  const dia = new Date(`${fecha}T00:00:00Z`);
  dia.setUTCDate(dia.getUTCDate() + dias);
  return dia.toISOString().slice(0, 10);
}

// Lunes de la semana de una fecha 'AAAA-MM-DD' (la semana va de lunes a domingo).
function lunesDeLaSemana(fecha) {
  const diaSemana = new Date(`${fecha}T00:00:00Z`).getUTCDay();
  return sumarDias(fecha, -((diaSemana + 6) % 7));
}

module.exports = { fechaEnChile, horaEnChile, sumarDias, lunesDeLaSemana };

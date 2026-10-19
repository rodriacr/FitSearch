// Fechas de la agenda (FS-HU-13 y FS-HU-14). Los horarios llegan como fecha "AAAA-MM-DD" y horas "HH:MM" en hora de
// Chile (America/Santiago); las fechas se formatean en UTC para que la zona del navegador no corra el día.
const ZONA = 'America/Santiago';
const fechaUtc = (fecha) => new Date(`${fecha}T12:00:00Z`);

export const fechaHorario = (h) =>
  `${new Intl.DateTimeFormat('es-CL', { dateStyle: 'full', timeZone: 'UTC' }).format(fechaUtc(h.fecha))}, ${h.horaInicio}–${h.horaFin}`;

// "martes 10 de noviembre"
export const fechaLarga = (fecha) =>
  new Intl.DateTimeFormat('es-CL', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(fechaUtc(fecha)).replace(',', '');

// "noviembre 2026"
export const tituloMes = (mes) =>
  new Intl.DateTimeFormat('es-CL', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(fechaUtc(`${mes}-01`)).replace(' de ', ' ');

// Fecha y hora actuales en Chile, como "AAAA-MM-DDTHH:MM".
export const ahoraChile = () =>
  new Intl.DateTimeFormat('sv-SE', { timeZone: ZONA, dateStyle: 'short', timeStyle: 'short', hourCycle: 'h23' })
    .format(new Date()).replace(' ', 'T');

export const futura = (r) => `${r.horario.fecha}T${r.horario.horaInicio}` > ahoraChile();

export const minutosEntre = (inicio, fin) => {
  const [hi, mi] = inicio.split(':').map(Number);
  const [hf, mf] = fin.split(':').map(Number);
  return hf * 60 + mf - (hi * 60 + mi);
};

// "09:30" + 45 → "10:15"; null si se pasa de las 23:59 (un bloque no cruza la medianoche).
export const sumarMinutos = (hora, minutos) => {
  const [h, m] = hora.split(':').map(Number);
  const total = h * 60 + m + minutos;
  return total >= 24 * 60 ? null : `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
};

// "30 min", "1 h", "1 h 30 min"
export const textoDuracion = (minutos) => {
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  if (!horas) return `${resto} min`;
  return resto ? `${horas} h ${resto} min` : `${horas} h`;
};

// Mes siguiente o anterior de "AAAA-MM".
export const moverMes = (mes, pasos) => {
  const [anio, numero] = mes.split('-').map(Number);
  const fecha = new Date(Date.UTC(anio, numero - 1 + pasos, 1));
  return `${fecha.getUTCFullYear()}-${String(fecha.getUTCMonth() + 1).padStart(2, '0')}`;
};

// Celdas del calendario de un mes "AAAA-MM", con semanas de lunes a domingo: null para los huecos antes del día 1.
export function diasDelMes(mes) {
  const [anio, numero] = mes.split('-').map(Number);
  const cantidad = new Date(Date.UTC(anio, numero, 0)).getUTCDate();
  const huecos = (new Date(Date.UTC(anio, numero - 1, 1)).getUTCDay() + 6) % 7;
  return [
    ...Array(huecos).fill(null),
    ...Array.from({ length: cantidad }, (_, i) => `${mes}-${String(i + 1).padStart(2, '0')}`),
  ];
}

// Instante UTC de una fecha y hora de Chile. Se calcula la diferencia horaria de ese día (cambia con el horario de
// verano) y se corrige una vez por si el cambio de hora cae entre la estimación y el resultado.
export function instanteChile(fecha, hora) {
  const [anio, mes, dia] = fecha.split('-').map(Number);
  const [h, m] = hora.split(':').map(Number);
  const comoUtc = Date.UTC(anio, mes - 1, dia, h, m);
  const desfase = (instante) => {
    const partes = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
      timeZone: ZONA, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
    }).formatToParts(new Date(instante)).map(({ type, value }) => [type, Number(value)]));
    return Date.UTC(partes.year, partes.month - 1, partes.day, partes.hour, partes.minute) - instante;
  };
  let instante = comoUtc - desfase(comoUtc);
  instante = comoUtc - desfase(instante);
  return new Date(instante);
}

const formatoIcs = (fecha) => fecha.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
const textoIcs = (texto) => texto.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
// Las líneas de más de 75 bytes se pliegan con salto y un espacio (RFC 5545); las tildes ocupan 2 bytes en UTF-8.
function plegar(linea) {
  const codificador = new TextEncoder();
  const partes = [];
  let actual = '';
  let bytes = 0;
  for (const caracter of linea) {
    const largo = codificador.encode(caracter).length;
    if (bytes + largo > (partes.length ? 74 : 75)) {
      partes.push(actual);
      actual = '';
      bytes = 0;
    }
    actual += caracter;
    bytes += largo;
  }
  return [...partes, actual].join('\r\n ');
}

// Archivo de calendario (.ics) de una solicitud de reserva, para importarlo en Google Calendar, Outlook o el calendario
// del celular. No se conecta con ningún servicio externo: el archivo se genera en el navegador.
export function crearIcs({ id, horario, profesional, lugar, ahora = new Date() }) {
  const lineas = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//FitSearch//Reservas//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:reserva-${id}@fitsearch`,
    `DTSTAMP:${formatoIcs(ahora)}`,
    `DTSTART:${formatoIcs(instanteChile(horario.fecha, horario.horaInicio))}`,
    `DTEND:${formatoIcs(instanteChile(horario.fecha, horario.horaFin))}`,
    `SUMMARY:${textoIcs(`Cita con ${profesional.nombre} (pendiente de confirmación)`)}`,
    `DESCRIPTION:${textoIcs(`${profesional.especialidad}. Solicitud enviada desde FitSearch: queda pendiente hasta que el profesional la confirme. Revisa su estado en Mis citas.`)}`,
    ...(lugar ? [`LOCATION:${textoIcs(lugar)}`] : []),
    'STATUS:TENTATIVE',
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return `${lineas.map(plegar).join('\r\n')}\r\n`;
}

export function descargarIcs(contenido, nombreArchivo) {
  const url = URL.createObjectURL(new Blob([contenido], { type: 'text/calendar;charset=utf-8' }));
  const enlace = document.createElement('a');
  enlace.href = url; enlace.download = nombreArchivo; enlace.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

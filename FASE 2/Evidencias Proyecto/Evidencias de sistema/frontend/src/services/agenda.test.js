// Fechas de la agenda y archivo .ics de la solicitud de reserva (FS-HU-14, SC-20).
import { describe, expect, test } from 'vitest';
import { crearIcs, diasDelMes, fechaLarga, instanteChile, moverMes, sumarMinutos, textoDuracion, tituloMes } from './agenda.js';

describe('Fechas', () => {
  test('nombra días y meses en español sin correr el día por la zona del navegador', () => {
    expect(fechaLarga('2026-11-10')).toBe('martes 10 de noviembre');
    expect(tituloMes('2026-11')).toBe('noviembre 2026');
    expect(moverMes('2026-12', 1)).toBe('2027-01');
    expect(moverMes('2026-01', -1)).toBe('2025-12');
  });

  test('arma el mes con semanas de lunes a domingo', () => {
    const celdas = diasDelMes('2026-11'); // el 1 de noviembre de 2026 es domingo
    expect(celdas.slice(0, 7)).toEqual([null, null, null, null, null, null, '2026-11-01']);
    expect(celdas.filter(Boolean)).toHaveLength(30);
    expect(diasDelMes('2026-06')[0]).toBe('2026-06-01'); // lunes: sin huecos
  });

  test('suma minutos a una hora sin cruzar la medianoche', () => {
    expect(sumarMinutos('09:30', 45)).toBe('10:15');
    expect(sumarMinutos('23:00', 45)).toBe('23:45');
    expect(sumarMinutos('23:30', 30)).toBeNull();
  });

  test('escribe la duración en minutos u horas', () => {
    expect(textoDuracion(30)).toBe('30 min');
    expect(textoDuracion(60)).toBe('1 h');
    expect(textoDuracion(90)).toBe('1 h 30 min');
  });

  test('convierte la hora de Chile a UTC según el horario de verano o de invierno', () => {
    expect(instanteChile('2026-11-10', '10:30').toISOString()).toBe('2026-11-10T13:30:00.000Z'); // verano, UTC-3
    expect(instanteChile('2026-07-15', '10:30').toISOString()).toBe('2026-07-15T14:30:00.000Z'); // invierno, UTC-4
  });
});

describe('Archivo .ics', () => {
  const ics = crearIcs({
    id: 9,
    horario: { fecha: '2026-11-10', horaInicio: '10:30', horaFin: '11:00' },
    profesional: { nombre: 'Javiera Morales', especialidad: 'Nutrición, deporte y bienestar' },
    lugar: 'Providencia u online',
    ahora: new Date('2026-10-19T20:00:00Z'),
  });

  test('describe la cita en UTC, como pendiente, con texto escapado', () => {
    expect(ics.startsWith('BEGIN:VCALENDAR\r\nVERSION:2.0\r\n')).toBe(true);
    expect(ics).toContain('UID:reserva-9@fitsearch\r\n');
    expect(ics).toContain('DTSTAMP:20261019T200000Z\r\n');
    expect(ics).toContain('DTSTART:20261110T133000Z\r\n');
    expect(ics).toContain('DTEND:20261110T140000Z\r\n');
    expect(ics).toContain('STATUS:TENTATIVE\r\n');
    expect(ics).toContain('SUMMARY:Cita con Javiera Morales (pendiente de confirmación)');
    expect(ics).toContain('Nutrición\\, deporte y bienestar.');
    expect(ics).toContain('LOCATION:Providencia u online\r\n');
    expect(ics.endsWith('END:VEVENT\r\nEND:VCALENDAR\r\n')).toBe(true);
  });

  test('pliega las líneas largas en 75 bytes como pide el estándar', () => {
    const lineas = ics.split('\r\n');
    expect(lineas.every((linea) => new TextEncoder().encode(linea).length <= 75)).toBe(true);
    expect(lineas.some((linea) => linea.startsWith(' '))).toBe(true);
    // Al desplegar se recupera el texto completo.
    expect(ics.replace(/\r\n /g, '')).toContain('Revisa su estado en Mis citas.');
  });
});

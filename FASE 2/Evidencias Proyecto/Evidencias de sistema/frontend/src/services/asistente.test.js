// Formatos de la pantalla del asistente IA (FS-HU-07) y de la recomendación de profesional (FS-HU-08).
import { describe, expect, test } from 'vitest';
import { bloquesDe, enlaceProfesionales, fechaCorta, nombreProfesionales } from './asistente.js';

describe('bloquesDe', () => {
  test('separa párrafos y agrupa las líneas que empiezan con «- » en una lista', () => {
    expect(bloquesDe('Puedes combinar:\n- Avena\n- Fruta\n\nY tomar agua.')).toEqual([
      { tipo: 'parrafo', lineas: ['Puedes combinar:'] },
      { tipo: 'lista', items: ['Avena', 'Fruta'] },
      { tipo: 'parrafo', lineas: ['Y tomar agua.'] },
    ]);
  });

  test('ignora líneas vacías y no confunde un guion dentro de una frase con una lista', () => {
    expect(bloquesDe('\n\nHola - adiós\n\n\n')).toEqual([{ tipo: 'parrafo', lineas: ['Hola - adiós'] }]);
  });
});

describe('fechaCorta', () => {
  const ahora = new Date('2026-10-21T15:00:00-03:00');
  test('hoy muestra la hora, ayer «Ayer», esta semana el día y antes la fecha', () => {
    expect(fechaCorta('2026-10-21T10:24:00-03:00', ahora)).toBe('10:24');
    expect(fechaCorta('2026-10-20T22:00:00-03:00', ahora)).toBe('Ayer');
    expect(fechaCorta('2026-10-19T09:00:00-03:00', ahora)).toMatch(/^Lun/);
    expect(fechaCorta('2026-08-12T09:00:00-04:00', ahora)).toBe('12-08');
  });
});

describe('recomendación de profesional', () => {
  test('nombra a los profesionales de cada especialidad del catálogo', () => {
    expect(['Entrenamiento personal', 'Kinesiología', 'Medicina deportiva', 'Nutrición', 'Psicología deportiva'].map(nombreProfesionales))
      .toEqual(['entrenadores personales', 'kinesiólogos', 'médicos deportivos', 'nutricionistas', 'psicólogos deportivos']);
    expect(nombreProfesionales('Fonoaudiología')).toBe('profesionales de Fonoaudiología');
  });

  test('enlaza al buscador de profesionales con la especialidad como filtro', () => {
    expect(enlaceProfesionales('Entrenamiento personal')).toBe('/profesionales?especialidad=Entrenamiento+personal');
    expect(new URLSearchParams(enlaceProfesionales('Nutrición').split('?')[1]).get('especialidad')).toBe('Nutrición');
  });
});

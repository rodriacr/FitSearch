// Dirección de atención que se muestra en la ficha, el mapa y la reserva (SC-24).
import { describe, expect, test } from 'vitest';
import { direccionDe } from './formato.js';

describe('direccionDe', () => {
  test('agrega la comuna cuando la dirección no la menciona', () => {
    expect(direccionDe({ direccion: 'Av. Italia 850', comuna: 'Providencia' })).toBe('Av. Italia 850, Providencia');
  });

  test('no repite la comuna si la dirección ya la incluye, sin importar mayúsculas', () => {
    expect(direccionDe({ direccion: 'Av. Providencia 1234, oficina 501', comuna: 'Providencia' })).toBe('Av. Providencia 1234, oficina 501');
    expect(direccionDe({ direccion: 'Irarrázaval 2401, ñuñoa', comuna: 'Ñuñoa' })).toBe('Irarrázaval 2401, ñuñoa');
  });

  test('la dirección propia tiene prioridad sobre la del establecimiento', () => {
    expect(direccionDe({ direccion: 'Calle Uno 1', comuna: null, establecimiento: { direccion: 'Calle Dos 2' } })).toBe('Calle Uno 1');
  });

  test('sin dirección propia usa la del establecimiento y, si no hay ninguna, devuelve null', () => {
    expect(direccionDe({ direccion: null, comuna: 'Melipilla', establecimiento: { direccion: 'Ortúzar 120' } })).toBe('Ortúzar 120');
    expect(direccionDe({ direccion: '', comuna: 'Melipilla', establecimiento: null })).toBeNull();
    expect(direccionDe({ comuna: 'Melipilla' })).toBeNull();
  });
});

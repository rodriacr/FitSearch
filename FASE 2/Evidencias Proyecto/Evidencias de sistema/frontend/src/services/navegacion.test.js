import { expect, test } from 'vitest';
import { destinoTrasIngreso } from './navegacion.js';
import { formatearKm, formatearNumero, iniciales, primerNombre } from './formato.js';

test('después de iniciar sesión vuelve a la ruta interna pedida o va al Inicio', () => {
  expect(destinoTrasIngreso({ desde: '/profesionales?q=nutri&distancia=5' })).toBe('/profesionales?q=nutri&distancia=5');
  expect(destinoTrasIngreso(null)).toBe('/inicio');
  expect(destinoTrasIngreso({})).toBe('/inicio');
  // Nunca redirige fuera de FitSearch.
  expect(destinoTrasIngreso({ desde: '//sitio-externo.example' })).toBe('/inicio');
  expect(destinoTrasIngreso({ desde: 'https://sitio-externo.example' })).toBe('/inicio');
});

test('los números se muestran con el formato de Chile', () => {
  expect(formatearNumero(2556)).toBe('2.556');
  expect(formatearNumero(4.5)).toBe('4,5');
  expect(formatearKm(2.34)).toBe('2,3 km');
  expect(iniciales('Ana María Pérez')).toBe('AM');
  expect(primerNombre('  Ana Pérez')).toBe('Ana');
});

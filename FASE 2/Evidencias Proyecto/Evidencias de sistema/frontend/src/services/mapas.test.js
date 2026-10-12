import { afterEach, beforeEach, expect, test, vi } from 'vitest';

beforeEach(() => {
  vi.useFakeTimers();
  vi.resetModules();
  delete window.google;
});
afterEach(() => {
  vi.useRealTimers();
  document.querySelectorAll('script[src*="maps.googleapis.com"]').forEach((s) => s.remove());
  delete window.google;
  delete window.fitsearchMapsListo;
});

test('una llegada posterior al plazo mantiene callback y un único script al reintentar', async () => {
  const { cargarGoogleMaps } = await import('./mapas.js');
  const primera = cargarGoogleMaps('clave-prueba');
  const vencimiento = expect(primera).rejects.toThrow('tardando');
  await vi.advanceTimersByTimeAsync(15000);
  await vencimiento;
  expect(window.fitsearchMapsListo).toBeTypeOf('function');
  const segunda = cargarGoogleMaps('clave-prueba');
  expect(document.querySelectorAll('script[src*="maps.googleapis.com"]')).toHaveLength(1);
  window.google = { maps: { importLibrary: vi.fn() } };
  window.fitsearchMapsListo();
  await expect(segunda).resolves.toBe(window.google.maps);
  await expect(cargarGoogleMaps('clave-prueba')).resolves.toBe(window.google.maps);
});

test('un fallo de descarga limpia el script y permite una descarga nueva', async () => {
  const { cargarGoogleMaps } = await import('./mapas.js');
  const primera = cargarGoogleMaps('clave-prueba');
  const rechazo = expect(primera).rejects.toThrow('No se pudo');
  document.querySelector('script[src*="maps.googleapis.com"]').onerror();
  await rechazo;
  const segunda = cargarGoogleMaps('clave-prueba');
  expect(document.querySelectorAll('script[src*="maps.googleapis.com"]')).toHaveLength(1);
  window.google = { maps: { importLibrary: vi.fn() } };
  window.fitsearchMapsListo();
  await expect(segunda).resolves.toBe(window.google.maps);
});

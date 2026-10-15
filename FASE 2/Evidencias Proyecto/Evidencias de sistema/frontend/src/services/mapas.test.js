import { afterEach, beforeEach, expect, test, vi } from 'vitest';

const SCRIPT = 'script[src*="maplibre-gl"]';
const ESTILOS = 'link[href*="maplibre-gl"]';

beforeEach(() => {
  vi.useFakeTimers();
  vi.resetModules();
  delete window.maplibregl;
});
afterEach(() => {
  vi.useRealTimers();
  document.querySelectorAll(`${SCRIPT}, ${ESTILOS}`).forEach((e) => e.remove());
  delete window.maplibregl;
});

test('una llegada posterior al plazo mantiene un único script al reintentar', async () => {
  const { cargarMapLibre } = await import('./mapas.js');
  const primera = cargarMapLibre();
  const vencimiento = expect(primera).rejects.toThrow('tardando');
  await vi.advanceTimersByTimeAsync(15000);
  await vencimiento;
  const segunda = cargarMapLibre();
  expect(document.querySelectorAll(SCRIPT)).toHaveLength(1);
  window.maplibregl = { Map: vi.fn() };
  document.querySelector(SCRIPT).onload();
  await expect(segunda).resolves.toBe(window.maplibregl);
  await expect(cargarMapLibre()).resolves.toBe(window.maplibregl);
});

test('un fallo de descarga limpia el script y permite una descarga nueva', async () => {
  const { cargarMapLibre } = await import('./mapas.js');
  const primera = cargarMapLibre();
  const rechazo = expect(primera).rejects.toThrow('No se pudo');
  document.querySelector(SCRIPT).onerror();
  await rechazo;
  const segunda = cargarMapLibre();
  expect(document.querySelectorAll(SCRIPT)).toHaveLength(1);
  window.maplibregl = { Map: vi.fn() };
  document.querySelector(SCRIPT).onload();
  await expect(segunda).resolves.toBe(window.maplibregl);
});

test('descarga una versión fija con huella SRI y agrega la hoja de estilos una sola vez', async () => {
  const { cargarMapLibre } = await import('./mapas.js');
  const carga = cargarMapLibre();
  cargarMapLibre();
  const script = document.querySelector(SCRIPT);
  expect(script.src).toMatch(/maplibre-gl@\d+\.\d+\.\d+\/dist\/maplibre-gl\.js$/);
  expect(script.getAttribute('integrity')).toMatch(/^sha384-/);
  expect(script.getAttribute('crossorigin')).toBe('anonymous');
  expect(document.querySelectorAll(ESTILOS)).toHaveLength(1);
  expect(document.querySelector(ESTILOS).getAttribute('integrity')).toMatch(/^sha384-/);
  window.maplibregl = { Map: vi.fn() };
  script.onload();
  await expect(carga).resolves.toBe(window.maplibregl);
});

test('si el script carga sin exponer MapLibre, falla y permite reintentar', async () => {
  const { cargarMapLibre } = await import('./mapas.js');
  const carga = cargarMapLibre();
  const rechazo = expect(carga).rejects.toThrow('No se pudo');
  document.querySelector(SCRIPT).onload();
  await rechazo;
  expect(document.querySelectorAll(SCRIPT)).toHaveLength(0);
});

test('si MapLibre ya está cargado no vuelve a descargarlo', async () => {
  window.maplibregl = { Map: vi.fn() };
  const { cargarMapLibre } = await import('./mapas.js');
  await expect(cargarMapLibre()).resolves.toBe(window.maplibregl);
  expect(document.querySelectorAll(SCRIPT)).toHaveLength(0);
});

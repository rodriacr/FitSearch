// Ubicación del navegador para la búsqueda por cercanía (FS-HU-05, DAS D23).
import { expect, test } from 'vitest';
import { simularUbicacion } from '../tests/utilidades.jsx';
import { obtenerUbicacion, olvidarUbicacion, ubicacionSiHayPermiso } from './ubicacion.js';

test('redondea la ubicación a 3 decimales y no vuelve a preguntar mientras la recuerda', async () => {
  const posicion = simularUbicacion({ lat: -33.4371234, lng: -70.6504567 });
  expect(await obtenerUbicacion()).toEqual({ lat: -33.437, lng: -70.65 });
  await obtenerUbicacion();
  expect(posicion).toHaveBeenCalledTimes(1);
  olvidarUbicacion();
  await obtenerUbicacion();
  expect(posicion).toHaveBeenCalledTimes(2);
});

test('un rechazo del permiso se informa como "denegada" con un mensaje para la persona', async () => {
  simularUbicacion({ error: 1 });
  await expect(obtenerUbicacion()).rejects.toMatchObject({ motivo: 'denegada', message: expect.stringContaining('elige una comuna') });
});

test('sin permiso previo no abre el aviso del navegador', async () => {
  const posicion = simularUbicacion({ permiso: 'prompt' });
  expect(await ubicacionSiHayPermiso()).toBeNull();
  expect(posicion).not.toHaveBeenCalled();
});

test('sin geolocalización en el navegador se informa como no disponible', async () => {
  await expect(obtenerUbicacion()).rejects.toMatchObject({ motivo: 'no-disponible' });
  expect(await ubicacionSiHayPermiso()).toBeNull();
});

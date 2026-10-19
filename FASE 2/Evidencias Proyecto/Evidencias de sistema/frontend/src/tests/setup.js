import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';
import { olvidarUbicacion } from '../services/ubicacion.js';

// jsdom no implementa el scroll de la ventana: sin esto, cada cambio de pantalla (VolverArriba) ensucia la salida.
window.scrollTo = () => {};

afterEach(() => {
  cleanup();
  localStorage.clear();
  sessionStorage.clear();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  // La ubicación se guarda en memoria del módulo: cada prueba parte sin ella y sin geolocalización simulada.
  olvidarUbicacion();
  delete navigator.geolocation;
  delete navigator.permissions;
});

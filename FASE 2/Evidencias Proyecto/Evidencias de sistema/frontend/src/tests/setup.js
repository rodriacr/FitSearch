import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeAll, vi } from 'vitest';
import { olvidarUbicacion } from '../services/ubicacion.js';
import { olvidarFotoCuenta } from '../services/fotoCuenta.js';

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
  // La foto de la cuenta también vive en memoria del módulo (15-11-2026).
  olvidarFotoCuenta();
  delete navigator.geolocation;
  delete navigator.permissions;
});

// Precarga las rutas para las pruebas que montan pantallas de forma síncrona.
beforeAll(async () => { const { precargarPantallas } = await import('../services/diferirPantalla.jsx'); await precargarPantallas(); });

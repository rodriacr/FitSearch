import { solicitar } from './api.js';

// Logros y medallas (25-11-2026).
export const obtenerLogros = () => solicitar('/logros');
export const marcarLogrosVistos = () => solicitar('/logros/vistas', { metodo: 'POST' });

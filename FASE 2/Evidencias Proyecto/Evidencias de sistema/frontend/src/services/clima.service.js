import { solicitar } from './api.js';

// Clima actual del lugar de atención del profesional (DAS, D26). Si no está disponible, el Inicio lo oculta.
export const obtenerClima = () => solicitar('/clima');

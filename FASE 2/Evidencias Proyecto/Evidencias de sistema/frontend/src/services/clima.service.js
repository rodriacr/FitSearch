import { solicitar } from './api.js';
import { ubicarParaClima } from './ubicacionClima.js';

// La ubicación aproximada viaja al backend en el cuerpo; no se guarda en el perfil ni en la URL.
export async function obtenerClima() {
  const punto = await ubicarParaClima();
  return solicitar('/clima', { metodo: 'POST', cuerpo: punto });
}

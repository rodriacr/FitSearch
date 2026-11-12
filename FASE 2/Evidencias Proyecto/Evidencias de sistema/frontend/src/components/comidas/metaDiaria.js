// Cálculos frente a la meta diaria, comunes al Resumen y a las Estadísticas de Comidas (11-11-2026).
import reglas from '@shared/reglas.json';
import { formatearNumero } from '../../services/formato.js';

// Un día está «cerca de la meta» si queda dentro de este margen (±10 %), el mismo que usa el backend.
export const MARGEN = reglas.comidas.estadisticas.margenMeta;
export const MARGEN_PCT = Math.round(MARGEN * 100);

export const porcentajeDe = (valor, meta) => (meta ? Math.round((valor / meta) * 100) : null);
// Con el porcentaje redondeado, como se muestra: un día con «90 %» cuenta como cerca (igual que en el backend).
export const cercaDeLaMeta = (valor, meta) => Boolean(meta) && Math.abs(porcentajeDe(valor, meta) - 100) <= MARGEN_PCT;

// Cuánto falta o sobra para la meta, en palabras: «Te faltan 650 kcal», «Llegaste a tu meta» o «Te pasaste por 120 kcal».
// corto: la versión de una línea para cada nutriente («faltan 40 g», «meta cumplida», «20 g sobre la meta»).
export function frenteALaMeta(consumo, meta, unidad, { corto = false } = {}) {
  if (!meta) return null;
  const diferencia = Math.round((meta - consumo) * 10) / 10;
  const cantidad = `${formatearNumero(Math.abs(diferencia))} ${unidad}`;
  if (porcentajeDe(consumo, meta) > 100 + MARGEN_PCT) {
    return { estado: 'sobre', texto: corto ? `${cantidad} sobre la meta` : `Te pasaste por ${cantidad}` };
  }
  if (diferencia <= 0) return { estado: 'cumplida', texto: corto ? 'Meta cumplida' : 'Llegaste a tu meta' };
  return { estado: cercaDeLaMeta(consumo, meta) ? 'cerca' : 'falta', texto: corto ? `faltan ${cantidad}` : `Te faltan ${cantidad}` };
}

// Reparto en porcentajes enteros que suman 100 (resto mayor), a partir de las calorías de cada macronutriente.
export function repartoDeCalorias({ proteinasG, carbohidratosG, grasasG }, kcalPorGramo = reglas.comidas.kcalPorGramo) {
  const partes = [
    ['proteinas', proteinasG * kcalPorGramo.proteinas],
    ['carbohidratos', carbohidratosG * kcalPorGramo.carbohidratos],
    ['grasas', grasasG * kcalPorGramo.grasas],
  ];
  const total = partes.reduce((suma, [, kcal]) => suma + kcal, 0);
  if (!total) return null;
  const exactos = partes.map(([clave, kcal]) => ({ clave, exacto: (kcal / total) * 100 }));
  const enteros = Object.fromEntries(exactos.map(({ clave, exacto }) => [clave, Math.floor(exacto)]));
  let faltan = 100 - Object.values(enteros).reduce((suma, valor) => suma + valor, 0);
  for (const { clave } of [...exactos].sort((a, b) => (b.exacto % 1) - (a.exacto % 1))) {
    if (faltan <= 0) break;
    enteros[clave] += 1;
    faltan -= 1;
  }
  return enteros;
}

// Estimaciones nutricionales a partir de los datos básicos del perfil (FS-HU-02; base del objetivo diario de FS-HU-10).
const { perfil: reglas, comidas: reglasComidas } = require('../../../shared/reglas.json');

const AJUSTE_SEXO = { masculino: 5, femenino: -161 };
const MACROS = ['proteinas', 'carbohidratos', 'grasas'];
const { planes: PLANES, kcalPorGramo: KCAL_POR_GRAMO } = reglasComidas;

// Tasa metabólica basal con la ecuación de Mifflin-St Jeor (kcal/día).
function tasaMetabolicaBasal({ pesoKg, alturaCm, edad, sexo }) {
  return 10 * pesoKg + 6.25 * alturaCm - 5 * edad + AJUSTE_SEXO[sexo];
}

// Requerimiento calórico diario estimado = TMB × factor de actividad física. Devuelve null si faltan datos.
function requerimientoCalorico(datos) {
  const { pesoKg, alturaCm, edad, sexo, actividadFisica } = datos;
  const actividad = reglas.actividadFisica.find((opcion) => opcion.valor === actividadFisica);
  if ([pesoKg, alturaCm, edad].some((valor) => valor === null || valor === undefined) || !actividad || !(sexo in AJUSTE_SEXO)) {
    return null;
  }
  return Math.round(tasaMetabolicaBasal({ pesoKg, alturaCm, edad, sexo }) * actividad.factor);
}

// Porcentajes enteros que suman exactamente 100 (método del mayor resto).
function repartoEnteros(valores) {
  const enteros = valores.map(Math.floor);
  let faltan = 100 - enteros.reduce((suma, valor) => suma + valor, 0);
  const porResto = valores.map((valor, indice) => ({ indice, resto: valor - Math.floor(valor) })).sort((a, b) => b.resto - a.resto);
  for (const { indice } of porResto) {
    if (faltan <= 0) break;
    enteros[indice] += 1;
    faltan -= 1;
  }
  return enteros;
}

// Gramos de cada macronutriente para unas calorías y un reparto en porcentajes.
function gramosDe(kcal, porcentajes) {
  if (kcal === null || kcal === undefined) return { proteinasG: null, carbohidratosG: null, grasasG: null };
  return Object.fromEntries(MACROS.map((macro) => [`${macro}G`, Math.round((kcal * porcentajes[macro]) / 100 / KCAL_POR_GRAMO[macro])]));
}

// Calorías al día que se restan o suman para bajar o subir un ritmo de kilos por semana (unas 7.700 kcal por kilo).
const kcalPorRitmo = (ritmoSemanalKg) => Math.round((ritmoSemanalKg * PLANES.metaPeso.kcalPorKg) / 7);

// Calorías del día según la meta: el requerimiento del perfil con el ajuste de la meta (menos para bajar de peso, más para
// ganar masa). Con una meta de peso (11-11-2026), el ajuste sale del ritmo semanal elegido en vez del porcentaje. Al bajar
// de peso nunca queda bajo el piso de seguridad por sexo (1.200 o 1.500 kcal), salvo que el propio requerimiento ya sea menor.
function caloriasSegunMeta(objetivo, kcalBase, sexo, ritmoSemanalKg = null) {
  if (kcalBase === null || kcalBase === undefined) return null;
  const { ajusteCalorias } = PLANES.metas[objetivo] ?? PLANES.metas.otro;
  const conRitmo = ritmoSemanalKg && (objetivo === 'bajar_peso' || objetivo === 'aumentar_masa');
  const signo = objetivo === 'bajar_peso' ? -1 : 1;
  const kcal = conRitmo ? kcalBase + signo * kcalPorRitmo(ritmoSemanalKg) : Math.round(kcalBase * (1 + ajusteCalorias));
  if (kcal >= kcalBase) return kcal;
  const piso = PLANES.caloriasMinimas[sexo] ?? PLANES.caloriasMinimas.femenino;
  return Math.max(kcal, Math.min(kcalBase, piso));
}

// Plan según la meta del perfil (11-11-2026; fuentes en el README): la proteína se calcula por kilo de peso, las grasas
// como porcentaje de las calorías (entre 20 % y 35 %) y los carbohidratos con lo que queda. En «Mejorar rendimiento» los
// carbohidratos también van por kilo y las grasas toman el resto. Sin peso o sin requerimiento se usa la referencia
// (70 kg y 2.300 kcal), solo para mostrar el reparto en porcentajes.
function planPorMeta({ objetivo, kcalBase = null, pesoKg = null, sexo = null, ritmoSemanalKg = null }) {
  const meta = PLANES.metas[objetivo] ?? PLANES.metas.otro;
  const kcal = caloriasSegunMeta(objetivo, kcalBase, sexo, ritmoSemanalKg);
  const kcalCalculo = kcal ?? caloriasSegunMeta(objetivo, PLANES.referencia.kcal, null, ritmoSemanalKg);
  const peso = pesoKg ?? PLANES.referencia.pesoKg;
  const minimoGrasas = (kcalCalculo * PLANES.grasasPct.min) / 100;
  const maximoGrasas = (kcalCalculo * PLANES.grasasPct.max) / 100;
  const proteinas = Math.min(meta.proteinaGKg * peso * KCAL_POR_GRAMO.proteinas, (kcalCalculo * PLANES.proteinaMaxPct) / 100);
  let grasas;
  let carbohidratos;
  if (meta.carbohidratosGKg) {
    carbohidratos = meta.carbohidratosGKg * peso * KCAL_POR_GRAMO.carbohidratos;
    grasas = Math.min(Math.max(kcalCalculo - proteinas - carbohidratos, minimoGrasas), maximoGrasas);
  } else {
    grasas = (kcalCalculo * meta.grasasPct) / 100;
  }
  carbohidratos = kcalCalculo - proteinas - grasas;
  const [p, c, g] = repartoEnteros([proteinas, carbohidratos, grasas].map((valor) => (valor / kcalCalculo) * 100));
  const porcentajes = { proteinas: p, carbohidratos: c, grasas: g };
  // ajusteKcal: cuánto se restó o sumó al requerimiento (null sin perfil completo).
  return { kcal, porcentajes, ajusteCalorias: meta.ajusteCalorias, ajusteKcal: kcal === null ? null : kcal - kcalBase, ...gramosDe(kcal, porcentajes) };
}

module.exports = { tasaMetabolicaBasal, requerimientoCalorico, repartoEnteros, gramosDe, kcalPorRitmo, caloriasSegunMeta, planPorMeta };

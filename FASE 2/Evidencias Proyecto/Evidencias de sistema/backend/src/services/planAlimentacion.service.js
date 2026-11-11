// Plan de alimentación de Comidas (11-11-2026; pedido del PO). Hay dos tipos:
// - «meta»: calorías y reparto según la meta del perfil (bajar de peso, mantener, ganar masa, rendimiento u otro),
//   calculados en nutricion.service a partir del peso y del requerimiento calórico. Cambia solo si cambia el perfil.
// - «personalizado»: uno de la lista de planes propios (nombre y tres porcentajes entre 5 % y 80 % que suman 100); las
//   calorías siguen la meta. Se pueden guardar varios e ir cambiando entre ellos.
// El plan elegido rige desde su día y guarda una copia de los porcentajes, así las fechas anteriores conservan el suyo.
// La meta de peso (peso al que se quiere llegar y ritmo semanal) ajusta las calorías al bajar de peso o ganar masa.
const { comidas: { planes }, perfil: reglasPerfil } = require('../../../shared/reglas.json');
const modelo = require('../models/planAlimentacion.model');
const usuarioModel = require('../models/usuario.model');
const { requerimientoCalorico, planPorMeta, gramosDe, kcalPorRitmo } = require('./nutricion.service');
const { fechaEnChile, sumarDias } = require('../utils/fechaChile');
const ErrorHttp = require('../utils/ErrorHttp');

const MACROS = ['proteinas', 'carbohidratos', 'grasas'];
const OBJETIVOS_CON_PESO = Object.keys(planes.metaPeso.ritmos);
const PLAN_META = { tipo: 'meta', planPersonalizadoId: null, proteinasPct: null, carbohidratosPct: null, grasasPct: null };
const numero = (valor) => (valor === null || valor === undefined ? null : Number(valor));
const unDecimal = (valor) => Math.round(valor * 10) / 10;
const porcentajesDe = (fila) => ({ proteinas: fila.proteinasPct, carbohidratos: fila.carbohidratosPct, grasas: fila.grasasPct });
const fechaIso = (fecha) => fecha.toISOString().slice(0, 10);

function datosDelPerfil(perfil) {
  return {
    pesoKg: numero(perfil?.pesoKg), alturaCm: numero(perfil?.alturaCm), edad: perfil?.edad ?? null,
    sexo: perfil?.sexo ?? null, actividadFisica: perfil?.actividadFisica ?? null, objetivo: perfil?.objetivoPrincipal ?? null,
  };
}

// La meta de peso se aplica solo mientras siga siendo la meta del perfil.
const metaQueAplica = (meta, objetivo) => (meta && meta.objetivo === objetivo ? meta : null);

// Plan aplicado: el recomendado para la meta o los porcentajes guardados, siempre con las calorías de la meta.
function calcular(perfil, guardado, meta = null) {
  const datos = datosDelPerfil(perfil);
  const kcalBase = requerimientoCalorico(datos);
  const ritmoSemanalKg = numero(metaQueAplica(meta, datos.objetivo)?.ritmoSemanalKg);
  const recomendado = planPorMeta({ objetivo: datos.objetivo, kcalBase, pesoKg: datos.pesoKg, sexo: datos.sexo, ritmoSemanalKg });
  const personalizado = guardado?.tipo === 'personalizado';
  const porcentajes = personalizado ? porcentajesDe(guardado) : recomendado.porcentajes;
  return {
    tipo: personalizado ? 'personalizado' : 'meta', kcal: recomendado.kcal, kcalBase, porcentajes, ...gramosDe(recomendado.kcal, porcentajes),
    recomendado, datos, ritmoSemanalKg,
  };
}

// Plan que rige en una fecha (lo usan el resumen del día, la semana y las estadísticas de Comidas).
async function delDia(usuarioId, fecha, usuario) {
  const [cuenta, guardado, meta] = await Promise.all([
    usuario ?? usuarioModel.buscarPorIdConPerfil(usuarioId), modelo.vigente(usuarioId, fecha), modelo.metaPeso(usuarioId),
  ]);
  return { ...calcular(cuenta?.perfil, guardado, meta), usuario: cuenta };
}

// Pesos que se pueden elegir como meta: bajo el peso actual (sin bajar de un IMC de 18,5) para bajar de peso, o sobre el
// peso actual (sin pasar un IMC de 30) para ganar masa. Sin altura, solo los límites generales de 30 a 300 kg.
function rangoPesoObjetivo({ objetivo, pesoKg, alturaCm }) {
  if (!OBJETIVOS_CON_PESO.includes(objetivo) || pesoKg === null) return null;
  const { imc, pesoKg: limites } = planes.metaPeso;
  const altura2 = alturaCm ? (alturaCm / 100) ** 2 : null;
  if (objetivo === 'bajar_peso') {
    return { min: Math.max(limites.min, altura2 ? Math.ceil(imc.min * altura2 * 10) / 10 : limites.min), max: unDecimal(pesoKg - 0.1), porImc: Boolean(altura2) };
  }
  return { min: unDecimal(pesoKg + 0.1), max: Math.min(limites.max, altura2 ? Math.floor(imc.max * altura2 * 10) / 10 : limites.max), porImc: Boolean(altura2) };
}

// Avance de la meta de peso con el peso actual del perfil y fecha estimada de llegada al ritmo elegido.
function resumenMetaPeso(meta, datos, hoy) {
  if (!meta) return null;
  const bajar = meta.objetivo === 'bajar_peso';
  const inicial = numero(meta.pesoInicialKg);
  const objetivo = numero(meta.pesoObjetivoKg);
  const ritmo = numero(meta.ritmoSemanalKg);
  const actual = datos.pesoKg;
  const faltanKg = actual === null ? null : Math.max(0, unDecimal(bajar ? actual - objetivo : objetivo - actual));
  const alcanzada = faltanKg === 0;
  const semanas = faltanKg === null || alcanzada ? null : Math.ceil(faltanKg / ritmo);
  const avance = actual === null ? null : ((bajar ? inicial - actual : actual - inicial) / Math.abs(inicial - objetivo)) * 100;
  return {
    objetivo: meta.objetivo, aplica: meta.objetivo === datos.objetivo, pesoInicialKg: inicial, pesoObjetivoKg: objetivo, pesoActualKg: actual,
    ritmoSemanalKg: ritmo, ajusteKcal: (bajar ? -1 : 1) * kcalPorRitmo(ritmo), fechaInicio: fechaIso(meta.fechaInicio),
    faltanKg, alcanzada, semanas, fechaEstimada: semanas === null ? null : sumarDias(hoy, semanas * 7),
    avancePct: avance === null ? null : Math.min(100, Math.max(0, Math.round(avance))),
  };
}

async function obtener(usuarioId, ahora = new Date()) {
  const hoy = fechaEnChile(ahora);
  const [usuario, guardado, lista, meta] = await Promise.all([
    usuarioModel.buscarPorIdConPerfil(usuarioId), modelo.vigente(usuarioId, hoy), modelo.personalizados(usuarioId), modelo.metaPeso(usuarioId),
  ]);
  const plan = calcular(usuario?.perfil, guardado, meta);
  const { objetivo } = plan.datos;
  const etiqueta = reglasPerfil.objetivoPrincipal.find(({ valor }) => valor === objetivo)?.etiqueta ?? null;
  const { kcal, porcentajes, proteinasG, carbohidratosG, grasasG, ajusteCalorias, ajusteKcal } = plan.recomendado;
  const enUso = plan.tipo === 'personalizado' ? guardado.planPersonalizadoId : null;
  return {
    plan: {
      tipo: plan.tipo,
      desde: guardado ? fechaIso(guardado.desde) : null,
      personalizadoId: enUso,
      nombre: lista.find(({ id }) => id === enUso)?.nombre ?? null,
      kcal: plan.kcal,
      porcentajes: plan.porcentajes,
      proteinasG: plan.proteinasG,
      carbohidratosG: plan.carbohidratosG,
      grasasG: plan.grasasG,
      // Proteína por kilo de peso, para comparar un plan personalizado con lo recomendado.
      proteinaGKg: plan.proteinasG !== null && plan.datos.pesoKg ? unDecimal(plan.proteinasG / plan.datos.pesoKg) : null,
    },
    meta: { valor: objetivo, etiqueta, ajusteCalorias, ajusteKcal, ritmoSemanalKg: plan.ritmoSemanalKg },
    metaPeso: resumenMetaPeso(meta, plan.datos, hoy),
    // Qué se puede elegir como meta de peso con la meta y el peso actuales (null si la meta no es de peso o falta el peso).
    opcionesMetaPeso: OBJETIVOS_CON_PESO.includes(objetivo) ? {
      ritmos: planes.metaPeso.ritmos[objetivo], ritmoPorDefecto: planes.metaPeso.ritmoPorDefecto[objetivo], rango: rangoPesoObjetivo(plan.datos),
    } : null,
    recomendado: { kcal, porcentajes, proteinasG, carbohidratosG, grasasG },
    perfil: { kcalBase: plan.kcalBase, pesoKg: plan.datos.pesoKg, completo: plan.kcalBase !== null },
    personalizados: lista.map((fila) => {
      const propios = porcentajesDe(fila);
      return { id: fila.id, nombre: fila.nombre, porcentajes: propios, ...gramosDe(plan.kcal, propios), enUso: fila.id === enUso };
    }),
    maxPersonalizados: planes.maxPersonalizados,
  };
}

function validarPorcentajes(valores) {
  const { min, max } = planes.personalizado;
  const errores = {};
  for (const macro of MACROS) {
    const valor = valores[macro];
    if (!Number.isInteger(valor) || valor < min || valor > max) errores[macro] = `Elige un porcentaje entero entre ${min} y ${max}`;
  }
  if (Object.keys(errores).length) throw new ErrorHttp(400, 'Revisa los porcentajes del plan', errores);
  const suma = MACROS.reduce((total, macro) => total + valores[macro], 0);
  if (suma !== 100) {
    throw new ErrorHttp(400, `Los porcentajes suman ${suma} % y deben sumar 100 %`, { total: `Suman ${suma} %: ajústalos para llegar a 100 %` });
  }
}

function validarNombre(nombre) {
  const texto = typeof nombre === 'string' ? nombre.trim().replace(/\s+/g, ' ') : '';
  const { max } = planes.nombrePersonalizado;
  if (!texto) throw new ErrorHttp(400, 'Ponle un nombre a tu plan', { nombre: 'Ponle un nombre a tu plan' });
  if (texto.length > max) throw new ErrorHttp(400, `El nombre puede tener hasta ${max} caracteres`, { nombre: `Usa hasta ${max} caracteres` });
  return texto;
}

// Los datos de un plan personalizado tal como se guardan (nombre ordenado y porcentajes validados).
function datosPersonalizado({ nombre, proteinas, carbohidratos, grasas }) {
  const texto = validarNombre(nombre);
  validarPorcentajes({ proteinas, carbohidratos, grasas });
  return { nombre: texto, proteinasPct: proteinas, carbohidratosPct: carbohidratos, grasasPct: grasas };
}

// El índice único (usuario, nombre) no distingue mayúsculas ni tildes: «Volumen» y «volumen» son el mismo nombre.
function nombreRepetido(error) {
  if (error.code !== 'P2002') return error;
  return new ErrorHttp(409, 'Ya tienes un plan con ese nombre', { nombre: 'Ya tienes un plan con ese nombre; elige otro' });
}

async function propio(usuarioId, id) {
  const plan = await modelo.obtenerPersonalizado(id, usuarioId);
  if (!plan) throw new ErrorHttp(404, 'No encontramos ese plan personalizado');
  return plan;
}

// Desde hoy rige ese plan personalizado (con una copia de sus porcentajes).
function usar(usuarioId, plan, hoy) {
  return modelo.guardar(usuarioId, hoy, {
    tipo: 'personalizado', planPersonalizadoId: plan.id, proteinasPct: plan.proteinasPct, carbohidratosPct: plan.carbohidratosPct, grasasPct: plan.grasasPct,
  });
}

const enUsoHoy = (vigente, id) => vigente?.tipo === 'personalizado' && vigente.planPersonalizadoId === id;

// Elegir el plan que rige desde hoy: el de la meta o uno de la lista.
async function guardar(usuarioId, { tipo, personalizadoId }, ahora = new Date()) {
  const hoy = fechaEnChile(ahora);
  if (tipo === 'meta') {
    await modelo.guardar(usuarioId, hoy, PLAN_META);
  } else if (tipo === 'personalizado') {
    if (!Number.isInteger(personalizadoId)) throw new ErrorHttp(400, 'Elige uno de tus planes personalizados', { personalizadoId: 'Elige uno de tus planes personalizados' });
    await usar(usuarioId, await propio(usuarioId, personalizadoId), hoy);
  } else {
    throw new ErrorHttp(400, 'Elige un tipo de plan válido', { tipo: 'Elige «Según tu meta» o «Personalizado»' });
  }
  return obtener(usuarioId, ahora);
}

async function crearPersonalizado(usuarioId, { usar: usarlo = false, ...valores }, ahora = new Date()) {
  const datos = datosPersonalizado(valores);
  if (await modelo.contarPersonalizados(usuarioId) >= planes.maxPersonalizados) {
    throw new ErrorHttp(409, `Puedes guardar hasta ${planes.maxPersonalizados} planes personalizados; borra uno para crear otro`);
  }
  let creado;
  try {
    creado = await modelo.crearPersonalizado(usuarioId, datos);
  } catch (error) {
    throw nombreRepetido(error);
  }
  if (usarlo) await usar(usuarioId, creado, fechaEnChile(ahora));
  return obtener(usuarioId, ahora);
}

// Editar un plan de la lista. Si es el que se usa, desde hoy rige con los porcentajes nuevos; los días anteriores
// conservan los de antes.
async function actualizarPersonalizado(usuarioId, id, valores, ahora = new Date()) {
  await propio(usuarioId, id);
  const datos = datosPersonalizado(valores);
  const hoy = fechaEnChile(ahora);
  let actualizado;
  try {
    actualizado = await modelo.actualizarPersonalizado(id, datos);
  } catch (error) {
    throw nombreRepetido(error);
  }
  if (enUsoHoy(await modelo.vigente(usuarioId, hoy), id)) await usar(usuarioId, actualizado, hoy);
  return obtener(usuarioId, ahora);
}

// Borrar un plan de la lista. Si es el que se usa, desde hoy vuelve el plan de la meta.
async function eliminarPersonalizado(usuarioId, id, ahora = new Date()) {
  await propio(usuarioId, id);
  const hoy = fechaEnChile(ahora);
  if (enUsoHoy(await modelo.vigente(usuarioId, hoy), id)) await modelo.guardar(usuarioId, hoy, PLAN_META);
  await modelo.eliminarPersonalizado(id);
  return obtener(usuarioId, ahora);
}

const kg = (valor) => valor.toLocaleString('es-CL', { maximumFractionDigits: 1 });

async function guardarMetaPeso(usuarioId, { pesoObjetivoKg, ritmoSemanalKg }, ahora = new Date()) {
  const datos = datosDelPerfil((await usuarioModel.buscarPorIdConPerfil(usuarioId))?.perfil);
  const { objetivo, pesoKg } = datos;
  if (!OBJETIVOS_CON_PESO.includes(objetivo)) {
    throw new ErrorHttp(400, 'La meta de peso es para «Bajar de peso» o «Aumentar masa muscular»: elige una de ellas en Mi perfil');
  }
  if (pesoKg === null) throw new ErrorHttp(400, 'Primero anota tu peso actual en Mi perfil');
  const bajar = objetivo === 'bajar_peso';
  const rango = rangoPesoObjetivo(datos);
  const peso = Number.isFinite(pesoObjetivoKg) ? unDecimal(pesoObjetivoKg) : null;
  const errores = {};
  if (peso === null) {
    errores.pesoObjetivoKg = 'Escribe el peso al que quieres llegar';
  } else if (bajar && peso >= pesoKg) {
    errores.pesoObjetivoKg = `Para bajar de peso, elige un peso menor a tu peso actual (${kg(pesoKg)} kg)`;
  } else if (!bajar && peso <= pesoKg) {
    errores.pesoObjetivoKg = `Para aumentar masa muscular, elige un peso mayor a tu peso actual (${kg(pesoKg)} kg)`;
  } else if (peso < rango.min) {
    errores.pesoObjetivoKg = rango.porImc
      ? `Con tu altura, bajo ${kg(rango.min)} kg quedarías bajo el rango saludable (IMC 18,5)`
      : `Elige un peso de al menos ${kg(rango.min)} kg`;
  } else if (peso > rango.max) {
    errores.pesoObjetivoKg = rango.porImc
      ? `Con tu altura, sobre ${kg(rango.max)} kg pasarías un IMC de 30`
      : `Elige un peso de hasta ${kg(rango.max)} kg`;
  }
  if (!planes.metaPeso.ritmos[objetivo].includes(ritmoSemanalKg)) errores.ritmoSemanalKg = 'Elige uno de los ritmos disponibles';
  if (Object.keys(errores).length) throw new ErrorHttp(400, 'Revisa tu meta de peso', errores);

  // Si la meta sigue en la misma dirección se conserva el punto de partida, para no perder el avance.
  const anterior = await modelo.metaPeso(usuarioId);
  const inicial = numero(anterior?.pesoInicialKg);
  const seguir = anterior?.objetivo === objetivo && (bajar ? peso < inicial : peso > inicial);
  await modelo.guardarMetaPeso(usuarioId, {
    objetivo, pesoObjetivoKg: peso, ritmoSemanalKg,
    pesoInicialKg: seguir ? inicial : pesoKg,
    fechaInicio: seguir ? anterior.fechaInicio : new Date(`${fechaEnChile(ahora)}T00:00:00Z`),
  });
  return obtener(usuarioId, ahora);
}

async function eliminarMetaPeso(usuarioId, ahora = new Date()) {
  await modelo.eliminarMetaPeso(usuarioId);
  return obtener(usuarioId, ahora);
}

module.exports = {
  calcular, delDia, obtener, guardar, crearPersonalizado, actualizarPersonalizado, eliminarPersonalizado, guardarMetaPeso, eliminarMetaPeso,
};

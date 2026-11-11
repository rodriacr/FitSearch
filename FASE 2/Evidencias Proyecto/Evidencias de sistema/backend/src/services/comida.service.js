// Gestor de alimentación (FS-HU-09 y FS-HU-10; DAS CU-06). La persona registra alimentos del catálogo con sus gramos y
// el sistema calcula calorías y macronutrientes; el resumen del día se compara con su objetivo diario, que sale del
// requerimiento calórico del perfil (Mifflin-St Jeor) y del plan de alimentación que rige ese día (según la meta o
// personalizado; planAlimentacion.service).
// El asistente IA también puede agregar alimentos (prepararDesdeAsistente y guardarDesdeAsistente) con el mismo cálculo.
const { comidas: reglas, perfil: reglasPerfil } = require('../../../shared/reglas.json');
const modelo = require('../models/comida.model');
const planes = require('./planAlimentacion.service');
const { fechaEnChile, horaEnChile, sumarDias, lunesDeLaSemana } = require('../utils/fechaChile');
const ErrorHttp = require('../utils/ErrorHttp');

const MOMENTOS = reglas.momentos.map(({ valor }) => valor);
const ETIQUETA_MOMENTO = Object.fromEntries(reglas.momentos.map(({ valor, etiqueta }) => [valor, etiqueta]));
const MACROS = ['proteinas', 'carbohidratos', 'grasas'];
const PALABRAS_VACIAS = new Set(['de', 'del', 'la', 'el', 'los', 'las', 'con', 'y', 'un', 'una', 'en', 'al']);

const numero = (valor) => (valor === null || valor === undefined ? null : Number(valor));
const redondear = (valor) => Math.round(valor * 10) / 10;
const sinTildes = (texto) => texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const noEncontrado = () => new ErrorHttp(404, 'No encontramos ese registro de comida');

// Aporte de una porción: el catálogo informa por 100 g.
function aporte(alimento, gramos) {
  const factor = gramos / 100;
  return {
    calorias: Math.round(Number(alimento.calorias) * factor),
    proteinasG: redondear(Number(alimento.proteinasG) * factor),
    carbohidratosG: redondear(Number(alimento.carbohidratosG) * factor),
    grasasG: redondear(Number(alimento.grasasG) * factor),
  };
}

// Momento del día según la hora en Chile, cuando no se indica: desayuno hasta las 10:30, media mañana hasta las 12:30,
// almuerzo hasta las 16:00, merienda hasta las 19:30 y cena el resto (también de madrugada).
function momentoSegunHora(ahora = new Date()) {
  const [hora, minuto] = horaEnChile(ahora).split(':').map(Number);
  const minutos = hora * 60 + minuto;
  if (minutos >= 300 && minutos < 630) return 'desayuno';
  if (minutos >= 630 && minutos < 750) return 'media_manana';
  if (minutos >= 750 && minutos < 960) return 'almuerzo';
  if (minutos >= 960 && minutos < 1170) return 'merienda';
  return 'cena';
}

function exigirFechaPasada(fecha, ahora = new Date()) {
  if (fecha > fechaEnChile(ahora)) throw new ErrorHttp(400, 'No puedes registrar comidas en días que aún no llegan');
}

const sumar = (registros) => {
  const total = { calorias: 0, proteinasG: 0, carbohidratosG: 0, grasasG: 0 };
  for (const registro of registros) {
    total.calorias += registro.calorias ?? 0;
    for (const macro of MACROS) total[`${macro}G`] += registro[`${macro}G`] ?? 0;
  }
  for (const macro of MACROS) total[`${macro}G`] = redondear(total[`${macro}G`]);
  return total;
};

const formatearAlimento = ({ id, nombre, calorias, proteinasG, carbohidratosG, grasasG }) => ({
  id, nombre, calorias: Number(calorias), proteinasG: Number(proteinasG), carbohidratosG: Number(carbohidratosG), grasasG: Number(grasasG),
});

const formatearRegistro = (registro) => ({
  id: registro.id,
  fecha: registro.fecha.toISOString().slice(0, 10),
  momento: registro.momento,
  alimentoId: registro.alimentoId,
  nombre: registro.descripcionAlimento,
  gramos: Number(registro.gramos),
  calorias: registro.calorias,
  proteinasG: numero(registro.proteinasG),
  carbohidratosG: numero(registro.carbohidratosG),
  grasasG: numero(registro.grasasG),
  origen: registro.origen,
  hora: horaEnChile(registro.fechaCreacion),
});

// Objetivo de un día: las calorías y los gramos del plan de alimentación que rige esa fecha (11-11-2026; antes, el
// requerimiento del perfil con un reparto fijo de 30/45/25). Si el perfil está incompleto no hay objetivo, y la
// pantalla invita a completarlo.
async function objetivoDiario(usuarioId, fecha = fechaEnChile()) {
  const plan = await planes.delDia(usuarioId, fecha);
  const perfil = plan.usuario?.perfil;
  const { datos } = plan;
  return {
    calorias: plan.kcal,
    proteinasG: plan.proteinasG,
    carbohidratosG: plan.carbohidratosG,
    grasasG: plan.grasasG,
    plan: { tipo: plan.tipo, porcentajes: plan.porcentajes },
    perfil: {
      objetivoPrincipal: reglasPerfil.objetivoPrincipal.find(({ valor }) => valor === perfil?.objetivoPrincipal)?.etiqueta ?? null,
      pesoKg: datos.pesoKg,
      alturaCm: datos.alturaCm,
      actividadFisica: reglasPerfil.actividadFisica.find(({ valor }) => valor === datos.actividadFisica)?.etiqueta.split(' (')[0] ?? null,
    },
  };
}

function palabrasDeBusqueda(texto) {
  return texto.split(/\s+/).map((palabra) => palabra.trim()).filter((palabra) => palabra.length >= 2 && !PALABRAS_VACIAS.has(sinTildes(palabra))).slice(0, 4);
}

async function buscarAlimentos(texto) {
  const palabras = palabrasDeBusqueda(texto);
  if (palabras.length === 0) return { alimentos: [] };
  const filas = await modelo.buscarAlimentos(palabras, reglas.busqueda.resultados);
  return { alimentos: filas.map(formatearAlimento) };
}

async function delDia(usuarioId, fecha, ahora = new Date()) {
  exigirFechaPasada(fecha, ahora);
  const [filas, objetivo] = await Promise.all([modelo.delDia(usuarioId, fecha), objetivoDiario(usuarioId, fecha)]);
  const registros = filas.map(formatearRegistro);
  return {
    fecha,
    hoy: fechaEnChile(ahora),
    objetivo,
    consumo: sumar(registros),
    momentos: reglas.momentos.map(({ valor, etiqueta }) => {
      const propios = registros.filter((registro) => registro.momento === valor);
      return { momento: valor, etiqueta, hora: propios[0]?.hora ?? null, registros: propios, totales: sumar(propios) };
    }),
  };
}

// Progreso semanal: calorías de cada día de lunes a domingo de la semana de la fecha, frente al objetivo.
async function semana(usuarioId, fecha, ahora = new Date()) {
  exigirFechaPasada(fecha, ahora);
  const desde = lunesDeLaSemana(fecha);
  const hasta = sumarDias(desde, 6);
  // El objetivo de la semana es el del plan que rige su último día (o hoy, si la semana no termina).
  const [totales, objetivo] = await Promise.all([modelo.caloriasPorDia(usuarioId, desde, hasta), objetivoDiario(usuarioId, [hasta, fechaEnChile(ahora)].sort()[0])]);
  const porDia = new Map(totales.map(({ fecha: dia, _sum }) => [dia.toISOString().slice(0, 10), _sum.calorias ?? 0]));
  const hoy = fechaEnChile(ahora);
  return {
    desde,
    hasta,
    objetivoCalorias: objetivo.calorias,
    dias: Array.from({ length: 7 }, (_, i) => {
      const dia = sumarDias(desde, i);
      return { fecha: dia, calorias: porDia.get(dia) ?? 0, futuro: dia > hoy };
    }),
  };
}

// Primer y último día del período de una fecha: la semana va de lunes a domingo y el mes, del día 1 al último.
function limitesDelPeriodo(periodo, fecha) {
  if (periodo === 'mes') {
    const [anio, mes] = fecha.split('-').map(Number);
    const ultimo = new Date(Date.UTC(anio, mes, 0)).getUTCDate();
    return { desde: `${fecha.slice(0, 7)}-01`, hasta: `${fecha.slice(0, 7)}-${String(ultimo).padStart(2, '0')}` };
  }
  const desde = lunesDeLaSemana(fecha);
  return { desde, hasta: sumarDias(desde, 6) };
}

// Estadísticas de una semana o un mes (FS-HU-26): calorías y macronutrientes de cada día frente al objetivo diario, y el
// promedio de los días que tienen registros (un día sin registros no baja el promedio, porque puede ser un olvido).
async function estadisticas(usuarioId, { periodo, fecha }, ahora = new Date()) {
  exigirFechaPasada(fecha, ahora);
  const { desde, hasta } = limitesDelPeriodo(periodo, fecha);
  // El objetivo del período es el del plan que rige su último día (o hoy, si el período no termina).
  const [totales, objetivo] = await Promise.all([modelo.totalesPorDia(usuarioId, desde, hasta), objetivoDiario(usuarioId, [hasta, fechaEnChile(ahora)].sort()[0])]);
  const porDia = new Map(totales.map(({ fecha: dia, _sum }) => [dia.toISOString().slice(0, 10), _sum]));
  const hoy = fechaEnChile(ahora);
  const largo = Math.round((Date.parse(`${hasta}T00:00:00Z`) - Date.parse(`${desde}T00:00:00Z`)) / 86400000) + 1;
  const dias = Array.from({ length: largo }, (_, i) => {
    const dia = sumarDias(desde, i);
    const suma = porDia.get(dia);
    return {
      fecha: dia,
      calorias: suma?.calorias ?? 0,
      proteinasG: redondear(numero(suma?.proteinasG) ?? 0),
      carbohidratosG: redondear(numero(suma?.carbohidratosG) ?? 0),
      grasasG: redondear(numero(suma?.grasasG) ?? 0),
      conRegistros: Boolean(suma),
      futuro: dia > hoy,
    };
  });
  const conRegistros = dias.filter((dia) => dia.conRegistros);
  const promedioDe = (clave, decimales) => {
    const valor = conRegistros.reduce((total, dia) => total + dia[clave], 0) / conRegistros.length;
    return decimales ? redondear(valor) : Math.round(valor);
  };
  return {
    periodo,
    desde,
    hasta,
    hoy,
    objetivo: { calorias: objetivo.calorias, proteinasG: objetivo.proteinasG, carbohidratosG: objetivo.carbohidratosG, grasasG: objetivo.grasasG },
    dias,
    diasConRegistros: conRegistros.length,
    promedio: conRegistros.length === 0 ? null : {
      calorias: promedioDe('calorias'),
      ...Object.fromEntries(MACROS.map((macro) => [`${macro}G`, promedioDe(`${macro}G`, true)])),
    },
  };
}

async function agregar(usuarioId, { fecha, momento, alimentoId, gramos }, ahora = new Date()) {
  exigirFechaPasada(fecha, ahora);
  const alimento = await modelo.obtenerAlimento(alimentoId);
  // Un alimento desactivado (FS-HU-30) ya no se puede registrar de nuevo.
  if (!alimento?.activo) throw new ErrorHttp(404, 'No encontramos ese alimento en el catálogo');
  const registro = await modelo.crear({
    usuarioId, fecha, momento, alimentoId, descripcionAlimento: alimento.nombre, gramos, origen: 'manual', ...aporte(alimento, gramos),
  });
  return { registro: formatearRegistro(registro) };
}

// Cambiar los gramos recalcula el aporte con el catálogo; si el alimento ya no está en el catálogo, se escala el valor
// guardado. También se puede mover el alimento a otro momento del día.
async function actualizar(usuarioId, id, { gramos, momento }) {
  const actual = await modelo.obtener(id, usuarioId);
  if (!actual) throw noEncontrado();
  const datos = {};
  if (momento !== undefined) datos.momento = momento;
  if (gramos !== undefined) {
    datos.gramos = gramos;
    const alimento = actual.alimentoId ? await modelo.obtenerAlimento(actual.alimentoId) : null;
    const base = alimento ?? {
      calorias: ((actual.calorias ?? 0) * 100) / Number(actual.gramos),
      proteinasG: (numero(actual.proteinasG) ?? 0) * 100 / Number(actual.gramos),
      carbohidratosG: (numero(actual.carbohidratosG) ?? 0) * 100 / Number(actual.gramos),
      grasasG: (numero(actual.grasasG) ?? 0) * 100 / Number(actual.gramos),
    };
    Object.assign(datos, aporte(base, gramos));
  }
  return { registro: formatearRegistro(await modelo.actualizar(id, datos)) };
}

async function eliminar(usuarioId, id) {
  const { count } = await modelo.eliminar(id, usuarioId);
  if (!count) throw noEncontrado();
}

// Alimento del catálogo que mejor corresponde a un texto libre («pollo», «2 plátanos»): primero el que se llama así o
// lo tiene como sinónimo; si no, el de nombre más corto entre los que contienen todas las palabras.
async function resolverAlimento(texto) {
  const palabras = palabrasDeBusqueda(texto);
  if (palabras.length === 0) return null;
  const candidatos = await modelo.buscarAlimentos(palabras, 20);
  const buscado = sinTildes(texto);
  const exacto = candidatos.find(({ nombre, sinonimos }) => sinTildes(nombre) === buscado || sinonimos.split(',').map(sinTildes).includes(buscado));
  return exacto ?? [...candidatos].sort((a, b) => a.nombre.length - b.nombre.length)[0] ?? null;
}

// Alimentos pedidos en el chat (FS-HU-09), para el día de hoy en Chile, en el momento indicado o según la hora.
// Solo los busca en el catálogo y calcula su aporte, sin guardar: el asistente los guarda junto con los mensajes
// (guardarDesdeAsistente). Devuelve lo que se va a agregar y lo que no se encontró, para que el asistente lo diga.
async function prepararDesdeAsistente({ alimentos, momento }, ahora = new Date()) {
  const fecha = fechaEnChile(ahora);
  const momentoFinal = MOMENTOS.includes(momento) ? momento : momentoSegunHora(ahora);
  const agregados = [];
  const noEncontrados = [];
  for (const pedido of (Array.isArray(alimentos) ? alimentos : []).slice(0, reglas.alimentosPorMensaje)) {
    const nombre = typeof pedido?.nombre === 'string' ? pedido.nombre.trim().slice(0, 60) : '';
    const gramos = redondear(Number(pedido?.gramos));
    if (!nombre) continue;
    const alimento = Number.isFinite(gramos) && gramos >= reglas.gramos.min && gramos <= reglas.gramos.max ? await resolverAlimento(nombre) : null;
    if (!alimento) {
      noEncontrados.push(nombre);
      continue;
    }
    const datos = { fecha, momento: momentoFinal, alimentoId: alimento.id, descripcionAlimento: alimento.nombre, gramos, origen: 'asistente', ...aporte(alimento, gramos) };
    agregados.push({ nombre: alimento.nombre, gramos, calorias: datos.calorias, momento: momentoFinal, datos });
  }
  return { agregados, noEncontrados, momento: momentoFinal };
}

// Guarda lo preparado dentro de la transacción del asistente (`db`) y devuelve lo agregado con sus ids.
async function guardarDesdeAsistente(usuarioId, { agregados }, db) {
  const guardados = [];
  for (const { datos, ...agregado } of agregados) {
    const registro = await modelo.crear({ usuarioId, ...datos }, db);
    guardados.push({ id: registro.id, ...agregado });
  }
  return guardados;
}

const enumerar = (elementos) => (elementos.length < 2 ? elementos.join('') : `${elementos.slice(0, -1).join(', ')} y ${elementos.at(-1)}`);
const conComa = (valor) => String(valor).replace('.', ',');

// Respuesta del asistente después de agregar: la arma el backend, sin una segunda consulta al proveedor.
function textoAgregados({ agregados, noEncontrados, momento }) {
  const partes = [];
  if (agregados.length > 0) {
    const total = agregados.reduce((suma, { calorias }) => suma + (calorias ?? 0), 0);
    const detalle = enumerar(agregados.map(({ nombre, gramos, calorias }) => `${conComa(gramos)} g de ${nombre.toLowerCase()} (${calorias} kcal)`));
    partes.push(`Listo, agregué a tu ${ETIQUETA_MOMENTO[momento].toLowerCase()} de hoy: ${detalle}.${agregados.length > 1 ? ` En total suman ${total} kcal.` : ''}`);
    partes.push('Puedes revisarlo o cambiar los gramos en Comidas.');
  }
  if (noEncontrados.length > 0) {
    partes.push(`No encontré ${enumerar(noEncontrados.map((nombre) => `«${nombre}»`))} en la tabla de alimentos de FitSearch, o la cantidad no es válida. `
      + 'Puedes registrarlo en Comidas eligiendo un alimento parecido.');
  }
  return partes.join('\n') || 'No entendí qué alimento quieres agregar. Dime el alimento y sus gramos, por ejemplo: «agrega 100 g de pollo».';
}

module.exports = {
  buscarAlimentos, delDia, semana, estadisticas, agregar, actualizar, eliminar, objetivoDiario,
  prepararDesdeAsistente, guardarDesdeAsistente, textoAgregados, resolverAlimento, aporte, momentoSegunHora, MOMENTOS,
};

// «¿Cómo voy hoy?» en el asistente (SC-47): lo que la persona lleva hoy en Comidas y en Agua frente a su plan y su meta.
// El backend arma el texto con reglas simples, sin llamar al proveedor de IA: los datos de la persona nunca salen de
// FitSearch (DAS, QS7).
const comidas = require('./comida.service');
const agua = require('./agua.service');
const { fechaEnChile } = require('../utils/fechaChile');
const { agua: reglasAgua } = require('../../../shared/reglas.json');

const numero = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 0 });
const MACROS = ['proteinasG', 'carbohidratosG', 'grasasG'];
const VASO_ML = reglasAgua.vasoMl;

const par = (consumo, meta) => ({ consumo: Math.round(consumo ?? 0), meta: meta == null ? null : Math.round(meta) });

async function resumenDelDia(usuarioId, ahora = new Date()) {
  const fecha = fechaEnChile(ahora);
  const [dia, aguaDia] = await Promise.all([comidas.delDia(usuarioId, fecha, ahora), agua.delDia(usuarioId, fecha, ahora)]);
  const { objetivo, consumo } = dia;
  return {
    fecha,
    calorias: par(consumo.calorias, objetivo.calorias),
    ...Object.fromEntries(MACROS.map((clave) => [clave, par(consumo[clave], objetivo[clave])])),
    aguaMl: par(aguaDia.totalMl, aguaDia.metaMl),
  };
}

// «1.250 de 1.900 kcal (66 %)» o, sin meta, «800 kcal».
const cifra = ({ consumo, meta }, unidad) => (meta
  ? `${numero.format(consumo)} de ${numero.format(meta)} ${unidad} (${Math.round((consumo / meta) * 100)} %)`
  : `${numero.format(consumo)} ${unidad}`);

// Hasta dos consejos, del más importante al menos importante.
function consejos(r) {
  const lista = [];
  const sinRegistros = r.calorias.consumo === 0;
  if (!r.calorias.meta) lista.push('Completa tu perfil para ver cuánto te corresponde al día según tu meta.');
  if (sinRegistros) {
    lista.push('Todavía no registras comidas hoy. Dime lo que comiste y lo agrego, por ejemplo: «agrega 2 huevos al desayuno».');
  } else if (r.calorias.meta && r.calorias.consumo > r.calorias.meta * 1.1) {
    lista.push('Ya pasaste tu meta de calorías de hoy: para lo que queda del día, prefiere verduras, proteínas magras y agua.');
  } else if (r.proteinasG.meta && r.proteinasG.meta - r.proteinasG.consumo >= 20 && r.proteinasG.consumo < r.proteinasG.meta * 0.7) {
    lista.push(`Te faltan unos ${numero.format(r.proteinasG.meta - r.proteinasG.consumo)} g de proteína: pollo, pescado, huevos, legumbres o un yogur alto en proteína te ayudan a completarla.`);
  }
  const faltaAgua = r.aguaMl.meta ? r.aguaMl.meta - r.aguaMl.consumo : 0;
  if (r.aguaMl.meta && r.aguaMl.consumo < r.aguaMl.meta * 0.5) {
    const vasos = Math.ceil(faltaAgua / VASO_ML);
    lista.push(`Te faltan ${numero.format(faltaAgua)} ml de agua: unos ${vasos} ${vasos === 1 ? 'vaso' : 'vasos'}.`);
  }
  if (!lista.length) lista.push('¡Vas bien! Sigue así.');
  return lista.slice(0, 2);
}

// El detalle por macronutriente lo muestra la tarjeta del resumen bajo la respuesta: el texto no lo repite.
function textoResumen(r) {
  return `Así vas hoy: llevas ${cifra(r.calorias, 'kcal')} y ${cifra(r.aguaMl, 'ml')} de agua.\n\n${consejos(r).join(' ')}`;
}

module.exports = { resumenDelDia, textoResumen };

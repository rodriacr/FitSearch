// Perfil de la persona en el asistente de IA (SC-47). Solo con su permiso, el proveedor recibe un resumen de su perfil
// para personalizar las respuestas: edad, sexo, peso, estatura, actividad física, objetivo, comidas al día, horas de
// sueño y el plan de alimentación del día; con el permiso de salud, también sus condiciones, medicamentos y alergias.
// Nunca el nombre, el correo, el teléfono ni la dirección (DAS, QS7). Sin permiso, al proveedor no llega nada del perfil.
const { perfil: reglasPerfil, salud: reglasSalud } = require('../../../shared/reglas.json');
const modelo = require('../models/asistente.model');
const comidas = require('./comida.service');
const { fechaEnChile } = require('../utils/fechaChile');

const numero = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 1 });
const etiqueta = (catalogo, valor) => catalogo?.find((opcion) => opcion.valor === valor)?.etiqueta ?? valor;
const lista = (valor) => (Array.isArray(valor) ? valor : []);
const PERMITE = new Set(['perfil', 'perfil_salud']);

async function permiso(usuarioId) {
  const fila = await modelo.permisoPerfil(usuarioId);
  return { valor: fila?.permisoPerfilIa ?? null, fecha: fila?.permisoPerfilIaFecha ?? null };
}

async function guardarPermiso(usuarioId, valor, ahora = new Date()) {
  const fila = await modelo.guardarPermisoPerfil(usuarioId, valor, ahora);
  return { valor: fila.permisoPerfilIa, fecha: fila.permisoPerfilIaFecha };
}

function lineasDelPerfil(perfil) {
  if (!perfil) return [];
  const peso = perfil.pesoKg == null ? null : Number(perfil.pesoKg);
  const altura = perfil.alturaCm == null ? null : Number(perfil.alturaCm);
  const imc = peso && altura ? peso / (altura / 100) ** 2 : null;
  return [
    perfil.edad && `Edad: ${perfil.edad} años`,
    perfil.sexo && `Sexo: ${etiqueta(reglasPerfil.sexo, perfil.sexo).toLowerCase()}`,
    peso && `Peso: ${numero.format(peso)} kg`,
    altura && `Estatura: ${numero.format(altura)} cm`,
    imc && `IMC: ${numero.format(imc)}`,
    perfil.actividadFisica && `Actividad física: ${etiqueta(reglasPerfil.actividadFisica, perfil.actividadFisica)}`,
    perfil.objetivoPrincipal && `Objetivo principal: ${etiqueta(reglasPerfil.objetivoPrincipal, perfil.objetivoPrincipal)}`,
    perfil.comidasDia && `Comidas al día: ${perfil.comidasDia}`,
    perfil.horasSueno && `Horas de sueño: ${etiqueta(reglasPerfil.horasSueno, perfil.horasSueno)}`,
  ].filter(Boolean);
}

function lineasDeSalud(salud) {
  if (!salud) return ['Información de salud: todavía no la completa'];
  const nombres = (catalogo, valores) => lista(valores).map((valor) => etiqueta(catalogo, valor)).join(', ') || 'no indica';
  return [
    `Condiciones médicas: ${nombres(reglasSalud.condicionesMedicas, salud.condicionesMedicas)}`,
    `Medicamentos: ${salud.tomaMedicamentos ? nombres(reglasSalud.medicamentos, salud.medicamentos) : 'no toma'}`,
    `Alergias: ${nombres(reglasSalud.alergias, salud.alergias)}`,
  ];
}

// Resumen del perfil para el proveedor de IA, o null si la persona no dio permiso (o aún no responde).
async function contextoPermitido(usuarioId, ahora = new Date()) {
  const { valor } = await permiso(usuarioId);
  if (!PERMITE.has(valor)) return null;
  const conSalud = valor === 'perfil_salud';
  const [datos, objetivo] = await Promise.all([
    modelo.datosDelPerfil(usuarioId, conSalud),
    // Con el perfil incompleto no hay plan del día: el resumen sigue sin él.
    comidas.objetivoDiario(usuarioId, fechaEnChile(ahora)).catch(() => null),
  ]);
  const lineas = lineasDelPerfil(datos?.perfil);
  if (objetivo?.calorias) {
    lineas.push(`Plan de alimentación de hoy: ${numero.format(objetivo.calorias)} kcal, ${numero.format(objetivo.proteinasG)} g de proteínas, `
      + `${numero.format(objetivo.carbohidratosG)} g de carbohidratos y ${numero.format(objetivo.grasasG)} g de grasas`);
  }
  if (conSalud) lineas.push(...lineasDeSalud(datos?.informacionSalud));
  if (!lineas.length) return '- Autorizó usar su perfil, pero todavía no lo completa';
  return lineas.map((linea) => `- ${linea}`).join('\n');
}

module.exports = { permiso, guardarPermiso, contextoPermitido };

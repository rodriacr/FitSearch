// Experiencia y configuración del profesional (FS-HU-29). La experiencia (años, formación, a quién atiende, registro en la
// Superintendencia de Salud y precio referencial) se muestra en su ficha pública; la configuración guarda sus preferencias:
// confirmar automáticamente las reservas nuevas, recibir avisos por correo y enviar recordatorios a sus clientes.
const { Prisma } = require('@prisma/client');
const prisma = require('../models/prisma');
const ErrorHttp = require('../utils/ErrorHttp');
const { experiencia: reglas } = require('../../../shared/reglas.json');

const SIN_FICHA = 'Completa tu ficha profesional antes de continuar';
const ATIENDE_A = reglas.atiendeA.map((opcion) => opcion.valor);
const lista = (valor) => (Array.isArray(valor) ? valor : []);

async function fichaDe(usuarioId, select) {
  const ficha = await prisma.profesional.findUnique({ where: { usuarioId }, select: { id: true, ...select } });
  if (!ficha) throw new ErrorHttp(409, SIN_FICHA);
  return ficha;
}

const CAMPOS_EXPERIENCIA = { aniosExperiencia: true, formacion: true, atiendeA: true, registroSis: true, precioDesde: true };
const formatearExperiencia = (fila) => ({
  aniosExperiencia: fila.aniosExperiencia ?? null,
  formacion: lista(fila.formacion),
  atiendeA: lista(fila.atiendeA),
  registroSis: fila.registroSis ?? null,
  precioDesde: fila.precioDesde ?? null,
});

const entero = (valor) => (valor === null || valor === undefined || valor === '' ? null : Number(valor));

// Valida y normaliza la experiencia. Devuelve los datos o lanza un 400 con el detalle por campo.
function validarExperiencia(datos, anioActual = new Date().getUTCFullYear()) {
  const errores = {};
  const anios = entero(datos.aniosExperiencia);
  if (anios !== null && (!Number.isInteger(anios) || anios < reglas.anios.min || anios > reglas.anios.max)) {
    errores.aniosExperiencia = `Indica tus años de experiencia (de ${reglas.anios.min} a ${reglas.anios.max})`;
  }
  const formacion = [];
  if (!Array.isArray(datos.formacion ?? [])) errores.formacion = 'La formación debe ser una lista';
  else if ((datos.formacion ?? []).length > reglas.formacion.max) errores.formacion = `Agrega hasta ${reglas.formacion.max} estudios`;
  else {
    (datos.formacion ?? []).forEach((estudio, indice) => {
      const titulo = typeof estudio?.titulo === 'string' ? estudio.titulo.trim() : '';
      const institucion = typeof estudio?.institucion === 'string' ? estudio.institucion.trim() : '';
      const anio = entero(estudio?.anio);
      const { titulo: t, institucion: i } = reglas.formacion;
      if (titulo.length < t.min || titulo.length > t.max) errores[`formacion.${indice}.titulo`] = `Escribe el título (${t.min} a ${t.max} caracteres)`;
      if (institucion.length < i.min || institucion.length > i.max) errores[`formacion.${indice}.institucion`] = `Escribe la institución (${i.min} a ${i.max} caracteres)`;
      if (anio !== null && (!Number.isInteger(anio) || anio < reglas.formacion.anioMin || anio > anioActual)) {
        errores[`formacion.${indice}.anio`] = `Indica un año entre ${reglas.formacion.anioMin} y ${anioActual}`;
      }
      formacion.push({ titulo, institucion, anio });
    });
  }
  const atiendeA = datos.atiendeA ?? [];
  if (!Array.isArray(atiendeA) || atiendeA.some((valor) => !ATIENDE_A.includes(valor))) errores.atiendeA = 'Elige a quién atiendes de la lista';
  // El número del Registro Nacional de Prestadores Individuales: solo dígitos (se aceptan puntos y espacios al escribirlo).
  const sis = typeof datos.registroSis === 'string' ? datos.registroSis.replace(/[\s.]/g, '') : '';
  if (sis && !new RegExp(`^\\d{${reglas.registroSis.min},${reglas.registroSis.max}}$`).test(sis)) {
    errores.registroSis = `El número de registro tiene de ${reglas.registroSis.min} a ${reglas.registroSis.max} dígitos`;
  }
  const precio = entero(datos.precioDesde);
  if (precio !== null && (!Number.isInteger(precio) || precio < reglas.precio.min || precio > reglas.precio.max)) {
    errores.precioDesde = `Indica un valor entre $${reglas.precio.min.toLocaleString('es-CL')} y $${reglas.precio.max.toLocaleString('es-CL')}`;
  }
  if (Object.keys(errores).length) throw new ErrorHttp(400, 'Revisa los datos de tu experiencia', errores);
  // Prisma pide DbNull (no null) para dejar vacía una columna JSON.
  return {
    aniosExperiencia: anios,
    formacion: formacion.length ? formacion : Prisma.DbNull,
    atiendeA: Array.isArray(atiendeA) && atiendeA.length ? [...new Set(atiendeA)] : Prisma.DbNull,
    registroSis: sis || null,
    precioDesde: precio,
  };
}

async function obtenerExperiencia(usuarioId) {
  return { experiencia: formatearExperiencia(await fichaDe(usuarioId, CAMPOS_EXPERIENCIA)) };
}

async function guardarExperiencia(usuarioId, datos) {
  const limpios = validarExperiencia(datos);
  const ficha = await fichaDe(usuarioId, {});
  const fila = await prisma.profesional.update({ where: { id: ficha.id }, data: limpios, select: CAMPOS_EXPERIENCIA });
  return { experiencia: formatearExperiencia(fila) };
}

const CAMPOS_CONFIGURACION = { autoconfirmar: true, avisosCorreo: true, recordatorios: true };
const PREFERENCIAS = Object.keys(CAMPOS_CONFIGURACION);

async function obtenerConfiguracion(usuarioId) {
  const { autoconfirmar, avisosCorreo, recordatorios } = await fichaDe(usuarioId, CAMPOS_CONFIGURACION);
  return { configuracion: { autoconfirmar, avisosCorreo, recordatorios } };
}

// Se guarda solo lo que cambia: cada interruptor de la pantalla envía su preferencia.
async function guardarConfiguracion(usuarioId, datos) {
  const cambios = Object.fromEntries(Object.entries(datos ?? {}).filter(([clave]) => PREFERENCIAS.includes(clave)));
  if (!Object.keys(cambios).length || Object.values(cambios).some((valor) => typeof valor !== 'boolean')) {
    throw new ErrorHttp(400, 'Indica la preferencia que quieres cambiar');
  }
  const ficha = await fichaDe(usuarioId, {});
  const configuracion = await prisma.profesional.update({ where: { id: ficha.id }, data: cambios, select: CAMPOS_CONFIGURACION });
  return { configuracion };
}

module.exports = { validarExperiencia, obtenerExperiencia, guardarExperiencia, obtenerConfiguracion, guardarConfiguracion };

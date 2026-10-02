// Lógica de negocio de los datos básicos del perfil (FS-HU-02).
const usuarioModel = require('../models/usuario.model');
const perfilModel = require('../models/perfil.model');
const { requerimientoCalorico } = require('./nutricion.service');
const ErrorHttp = require('../utils/ErrorHttp');

const aNumero = (valor) => (valor === null || valor === undefined ? null : Number(valor));

function formatearPerfil(perfil) {
  const datos = {
    pesoKg: aNumero(perfil?.pesoKg),
    alturaCm: aNumero(perfil?.alturaCm),
    edad: perfil?.edad ?? null,
    sexo: perfil?.sexo ?? null,
    actividadFisica: perfil?.actividadFisica ?? null,
  };
  return {
    perfil: datos,
    completo: Object.values(datos).every((valor) => valor !== null),
    requerimientoCaloricoKcal: requerimientoCalorico(datos),
  };
}

async function obtener(usuarioId) {
  const usuario = await usuarioModel.buscarPorIdConPerfil(usuarioId);
  if (!usuario) {
    throw new ErrorHttp(401, 'La sesión no corresponde a un usuario válido');
  }
  return {
    usuario: { id: usuario.id, nombre: usuario.nombre, correo: usuario.correo, rol: usuario.rol.nombre },
    ...formatearPerfil(usuario.perfil),
  };
}

async function actualizar(usuarioId, { pesoKg, alturaCm, edad, sexo, actividadFisica }) {
  await perfilModel.guardar(usuarioId, { pesoKg, alturaCm, edad, sexo, actividadFisica });
  return obtener(usuarioId);
}

module.exports = { obtener, actualizar, formatearPerfil };

// Lógica de negocio del perfil: tipo de cuenta y datos básicos (FS-HU-02), objetivos y estilo de vida (FS-HU-18)
// e información de salud (FS-HU-19).
const usuarioModel = require('../models/usuario.model');
const { ROLES_CUENTA, refirmarToken } = require('./auth.service');
const perfilModel = require('../models/perfil.model');
const saludModel = require('../models/salud.model');
const { requerimientoCalorico } = require('./nutricion.service');
const ErrorHttp = require('../utils/ErrorHttp');

const aNumero = (valor) => (valor === null || valor === undefined ? null : Number(valor));
const lista = (valor) => (Array.isArray(valor) ? valor : []);

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

function formatearObjetivos(perfil) {
  return {
    objetivoPrincipal: perfil?.objetivoPrincipal ?? null,
    comidasDia: perfil?.comidasDia ?? null,
    horasSueno: perfil?.horasSueno ?? null,
  };
}

function formatearSalud(salud) {
  if (!salud) return null;
  return {
    condicionesMedicas: lista(salud.condicionesMedicas),
    tomaMedicamentos: salud.tomaMedicamentos,
    medicamentos: lista(salud.medicamentos),
    alergias: lista(salud.alergias),
  };
}

async function obtener(usuarioId) {
  const usuario = await usuarioModel.buscarPorIdConPerfil(usuarioId);
  if (!usuario) {
    throw new ErrorHttp(401, 'La sesión no corresponde a un usuario válido');
  }
  const basico = formatearPerfil(usuario.perfil);
  const objetivos = formatearObjetivos(usuario.perfil);
  const salud = formatearSalud(usuario.informacionSalud);
  return {
    usuario: { id: usuario.id, nombre: usuario.nombre, correo: usuario.correo, rol: usuario.rol.nombre },
    ...basico,
    objetivos,
    salud,
    // Pasos del asistente de perfil: se muestra mientras alguno esté pendiente.
    pasos: {
      tipoCuenta: usuario.rolConfirmado === true,
      datosPersonales: basico.completo,
      objetivos: Object.values(objetivos).every((valor) => valor !== null),
      salud: salud !== null,
    },
  };
}

// Primer paso del asistente (FS-HU-02): la persona indica si usa FitSearch como usuario o como profesional.
// Antes se elegía en el registro, donde era fácil equivocarse al entrar con Google.
async function actualizarTipoCuenta(usuarioId, { rol }, vencimientoToken) {
  if (!ROLES_CUENTA.includes(rol)) {
    throw new ErrorHttp(400, 'Los datos enviados no son válidos', { rol: 'Selecciona el tipo de cuenta' });
  }
  const usuario = await usuarioModel.confirmarRol(usuarioId, rol);
  // Se devuelve un token nuevo porque el rol viaja dentro del token.
  return { ...(await obtener(usuarioId)), token: refirmarToken(usuario, vencimientoToken) };
}

async function actualizar(usuarioId, { pesoKg, alturaCm, edad, sexo, actividadFisica }) {
  await perfilModel.guardar(usuarioId, { pesoKg, alturaCm, edad, sexo, actividadFisica });
  return obtener(usuarioId);
}

async function actualizarObjetivos(usuarioId, { objetivoPrincipal, comidasDia, horasSueno }) {
  await perfilModel.guardar(usuarioId, { objetivoPrincipal, comidasDia, horasSueno });
  return obtener(usuarioId);
}

async function actualizarSalud(usuarioId, { condicionesMedicas, tomaMedicamentos, medicamentos, alergias }) {
  await saludModel.guardar(usuarioId, {
    condicionesMedicas,
    tomaMedicamentos,
    medicamentos: tomaMedicamentos ? medicamentos : [],
    alergias,
  });
  return obtener(usuarioId);
}

module.exports = { obtener, actualizarTipoCuenta, actualizar, actualizarObjetivos, actualizarSalud, formatearPerfil };

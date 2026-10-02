// Recuperación de contraseña por correo (FS-HU-15; DAS, QS6 y D16).
const crypto = require('node:crypto');
const bcrypt = require('bcryptjs');
const config = require('../config/env');
const usuarioModel = require('../models/usuario.model');
const tokenModel = require('../models/tokenRecuperacion.model');
const correoService = require('./correo.service');
const ErrorHttp = require('../utils/ErrorHttp');

const MENSAJE_SOLICITUD = 'Si el correo está registrado, te enviamos un enlace para restablecer tu contraseña. Revisa tu bandeja de entrada.';
const MENSAJE_ENLACE_INVALIDO = 'El enlace no es válido o ya venció. Solicita uno nuevo.';

const hashear = (token) => crypto.createHash('sha256').update(token).digest('hex');

// Responde siempre lo mismo, exista o no la cuenta, para no revelar qué correos están registrados.
async function solicitar(correo) {
  const usuario = await usuarioModel.buscarPorCorreo(correo);
  if (usuario) {
    const token = crypto.randomBytes(32).toString('hex');
    const minutos = config.recuperacionMinutos;
    await tokenModel.reemplazarPorUsuario({
      usuarioId: usuario.id,
      tokenHash: hashear(token),
      fechaExpiracion: new Date(Date.now() + minutos * 60 * 1000),
    });
    const enlace = `${config.urlFrontend}/restablecer-contrasena?token=${token}`;
    // El envío no se espera: así el tiempo de respuesta tampoco revela si la cuenta existe.
    correoService.enviarRecuperacion({ para: usuario.correo, nombre: usuario.nombre, enlace, minutos })
      .catch((error) => console.error('No fue posible enviar el correo de recuperación:', error.message));
  }
  return { mensaje: MENSAJE_SOLICITUD };
}

async function restablecer({ token, password }) {
  const registro = await tokenModel.buscarPorHash(hashear(token));
  if (!registro || registro.fechaUso || registro.fechaExpiracion <= new Date()) {
    throw new ErrorHttp(400, MENSAJE_ENLACE_INVALIDO);
  }
  const passwordHash = await bcrypt.hash(password, config.bcryptCosto);
  const cambiado = await tokenModel.usarYCambiarPassword({ id: registro.id, usuarioId: registro.usuarioId, passwordHash });
  if (!cambiado) throw new ErrorHttp(400, MENSAJE_ENLACE_INVALIDO);
  return { mensaje: 'Tu contraseña fue actualizada. Ya puedes iniciar sesión.' };
}

module.exports = { solicitar, restablecer, MENSAJE_SOLICITUD, MENSAJE_ENLACE_INVALIDO };

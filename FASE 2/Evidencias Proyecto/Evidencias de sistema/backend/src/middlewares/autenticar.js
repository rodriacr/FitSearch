// Verifica el token JWT de la cabecera Authorization y el rol del usuario.
const { verificarToken } = require('../services/auth.service');
const ErrorHttp = require('../utils/ErrorHttp');
const { estadoCuenta } = require('../models/sesion.model');

async function autenticar(req, res, next) {
  const [esquema, token] = (req.headers.authorization || '').split(' ');
  if (esquema !== 'Bearer' || !token) {
    return next(new ErrorHttp(401, 'Debes iniciar sesión'));
  }
  try {
    req.usuario = verificarToken(token);
  } catch {
    return next(new ErrorHttp(401, 'La sesión es inválida o expiró. Inicia sesión nuevamente'));
  }
  try {
    const cuenta = await estadoCuenta(req.usuario.id);
    if (!cuenta || !cuenta.activo || cuenta.versionSesion !== req.usuario.versionSesion) {
      return next(new ErrorHttp(401, 'La sesión ya no está disponible. Inicia sesión nuevamente'));
    }
    return next();
  } catch (error) { return next(error); }
}

function autorizarRoles(...roles) {
  return (req, res, next) => {
    if (!req.usuario || !roles.includes(req.usuario.rol)) {
      return next(new ErrorHttp(403, 'No tienes permisos para realizar esta acción'));
    }
    return next();
  };
}

module.exports = { autenticar, autorizarRoles };

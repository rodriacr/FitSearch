// Lógica de negocio de autenticación: registro, inicio de sesión y emisión de tokens JWT.
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config/env');
const usuarioModel = require('../models/usuario.model');
const ErrorHttp = require('../utils/ErrorHttp');

const MENSAJE_CREDENCIALES = 'Correo o contraseña incorrectos';
// Hash de referencia para comparar cuando el correo no existe y así no revelar, por tiempo de respuesta, si la cuenta existe.
const HASH_FICTICIO = bcrypt.hashSync('contrasena-ficticia-fitsearch', config.bcryptCosto);

function aUsuarioPublico(usuario) {
  return { id: usuario.id, nombre: usuario.nombre, correo: usuario.correo, rol: usuario.rol.nombre };
}

function firmarToken(usuario) {
  return jwt.sign({ rol: usuario.rol.nombre }, config.jwtSecreto, {
    subject: String(usuario.id),
    expiresIn: config.jwtExpiracion,
  });
}

async function registrar({ nombre, correo, password }) {
  const existente = await usuarioModel.buscarPorCorreo(correo);
  if (existente) {
    throw new ErrorHttp(409, 'El correo ya está registrado', { correo: 'Ya existe una cuenta con este correo' });
  }

  const passwordHash = await bcrypt.hash(password, config.bcryptCosto);
  let usuario;
  try {
    usuario = await usuarioModel.crearConPerfil({ nombre, correo, passwordHash, rolNombre: 'usuario' });
  } catch (error) {
    if (error.code === 'P2002') {
      throw new ErrorHttp(409, 'El correo ya está registrado', { correo: 'Ya existe una cuenta con este correo' });
    }
    if (error.code === 'P2025') {
      throw new Error('No existe el rol "usuario". Ejecuta "npm run db:seed" para cargar los roles iniciales.', { cause: error });
    }
    throw error;
  }

  return { token: firmarToken(usuario), usuario: aUsuarioPublico(usuario) };
}

async function iniciarSesion({ correo, password }) {
  const usuario = await usuarioModel.buscarPorCorreo(correo);
  const coincide = await bcrypt.compare(password, usuario ? usuario.passwordHash : HASH_FICTICIO);
  if (!usuario || !coincide) {
    throw new ErrorHttp(401, MENSAJE_CREDENCIALES);
  }
  return { token: firmarToken(usuario), usuario: aUsuarioPublico(usuario) };
}

function verificarToken(token) {
  const datos = jwt.verify(token, config.jwtSecreto);
  return { id: Number(datos.sub), rol: datos.rol };
}

module.exports = { registrar, iniciarSesion, verificarToken, MENSAJE_CREDENCIALES };

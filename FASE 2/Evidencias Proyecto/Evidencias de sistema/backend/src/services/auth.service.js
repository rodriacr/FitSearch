// Lógica de negocio de autenticación: registro, inicio de sesión y emisión de tokens JWT.
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config/env');
const usuarioModel = require('../models/usuario.model');
const googleService = require('./google.service');
const { usuario: reglasUsuario } = require('../../../shared/reglas.json');
const ErrorHttp = require('../utils/ErrorHttp');

const MENSAJE_CREDENCIALES = 'Correo o contraseña incorrectos';
const MENSAJE_OTRA_CUENTA_GOOGLE = 'Este correo ya está vinculado a otra cuenta de Google. Inicia sesión con tu contraseña.';
// Hash de referencia para comparar cuando el correo no existe y así no revelar, por tiempo de respuesta, si la cuenta existe.
const HASH_FICTICIO = bcrypt.hashSync('contrasena-ficticia-fitsearch', config.bcryptCosto);

function aUsuarioPublico(usuario) {
  return { id: usuario.id, nombre: usuario.nombre, correo: usuario.correo, rol: usuario.rol.nombre };
}

// Con "Recordarme" la sesión dura más (DAS, D17).
function firmarToken(usuario, recordar = false) {
  return jwt.sign({ rol: usuario.rol.nombre }, config.jwtSecreto, {
    subject: String(usuario.id),
    expiresIn: recordar ? config.jwtExpiracionRecordar : config.jwtExpiracion,
  });
}

// Tipos de cuenta que puede tener una persona; el administrador nunca se crea ni se elige desde la aplicación.
const ROLES_CUENTA = ['usuario', 'profesional'];
// Toda cuenta nueva parte como "usuario" y la persona confirma su tipo de cuenta en el asistente de perfil
// (FS-HU-02, cambio de flujo del 24-09-2026): antes se elegía en el registro y con Google se podía equivocar.
const ROL_INICIAL = 'usuario';

async function registrar({ nombre, correo, password }) {
  const existente = await usuarioModel.buscarPorCorreo(correo);
  if (existente) {
    throw new ErrorHttp(409, 'El correo ya está registrado', { correo: 'Ya existe una cuenta con este correo' });
  }

  const passwordHash = await bcrypt.hash(password, config.bcryptCosto);
  let usuario;
  try {
    usuario = await usuarioModel.crearConPerfil({ nombre, correo, passwordHash, rolNombre: ROL_INICIAL });
  } catch (error) {
    if (error.code === 'P2002') {
      throw new ErrorHttp(409, 'El correo ya está registrado', { correo: 'Ya existe una cuenta con este correo' });
    }
    if (error.code === 'P2025') {
      throw new Error(`No existe el rol "${ROL_INICIAL}". Ejecuta "npm run db:seed" para cargar los roles iniciales.`,
        { cause: error });
    }
    throw error;
  }

  return { token: firmarToken(usuario), usuario: aUsuarioPublico(usuario) };
}

async function iniciarSesion({ correo, password, recordar = false }) {
  const usuario = await usuarioModel.buscarPorCorreo(correo);
  // Las cuentas creadas con Google pueden no tener contraseña: se compara igual para no revelar nada por tiempo de respuesta.
  const coincide = await bcrypt.compare(password, usuario?.passwordHash || HASH_FICTICIO);
  if (!usuario || !usuario.passwordHash || !coincide) {
    throw new ErrorHttp(401, MENSAJE_CREDENCIALES);
  }
  return { token: firmarToken(usuario, recordar), usuario: aUsuarioPublico(usuario) };
}

function sesion(usuario, recordar, cuentaNueva) {
  return { token: firmarToken(usuario, recordar), usuario: aUsuarioPublico(usuario), cuentaNueva };
}

// "Continuar con Google" (FS-HU-16; DAS, D15). El navegador entrega el token de identidad firmado por Google,
// que aquí se valida antes de emitir la sesión de FitSearch: la contraseña del usuario nunca pasa por el sistema.
async function iniciarSesionConGoogle({ credencial, recordar = false }) {
  const { googleId, correo, nombre } = await googleService.verificarCredencial(credencial);

  const vinculado = await usuarioModel.buscarPorGoogleId(googleId);
  if (vinculado) return sesion(vinculado, recordar, false);

  // Si el correo ya tiene cuenta en FitSearch se vincula con Google en vez de crear otra, para no duplicar cuentas.
  const existente = await usuarioModel.buscarPorCorreo(correo);
  if (existente) {
    if (existente.googleId) throw new ErrorHttp(409, MENSAJE_OTRA_CUENTA_GOOGLE);
    return sesion(await usuarioModel.vincularGoogle(existente.id, googleId), recordar, false);
  }

  try {
    const creado = await usuarioModel.crearConPerfil({
      nombre: nombre.slice(0, reglasUsuario.nombre.max),
      correo,
      googleId,
      rolNombre: ROL_INICIAL,
    });
    return sesion(creado, recordar, true);
  } catch (error) {
    // Dos pestañas pueden intentar crear la misma cuenta a la vez: si ya quedó creada, se inicia sesión con ella.
    if (error.code === 'P2002') {
      const creadoEnParalelo = await usuarioModel.buscarPorGoogleId(googleId);
      if (creadoEnParalelo) return sesion(creadoEnParalelo, recordar, false);
      throw new ErrorHttp(409, MENSAJE_OTRA_CUENTA_GOOGLE);
    }
    if (error.code === 'P2025') {
      throw new Error(`No existe el rol "${ROL_INICIAL}". Ejecuta "npm run db:seed" para cargar los roles iniciales.`,
        { cause: error });
    }
    throw error;
  }
}

// El rol viaja dentro del token, así que al confirmar el tipo de cuenta hay que emitir uno nuevo.
// Conserva el vencimiento del token anterior para no acortar ni alargar la sesión de "Recordarme" (D17).
function refirmarToken(usuario, vencimiento) {
  return jwt.sign({ rol: usuario.rol.nombre, exp: vencimiento }, config.jwtSecreto, { subject: String(usuario.id) });
}

function verificarToken(token) {
  const datos = jwt.verify(token, config.jwtSecreto);
  return { id: Number(datos.sub), rol: datos.rol, vencimiento: datos.exp };
}

module.exports = {
  registrar,
  iniciarSesion,
  iniciarSesionConGoogle,
  refirmarToken,
  verificarToken,
  MENSAJE_CREDENCIALES,
  MENSAJE_OTRA_CUENTA_GOOGLE,
  ROLES_CUENTA,
  ROL_INICIAL,
};

const bcrypt = require('bcryptjs');
const prisma = require('../models/prisma');
const google = require('./google.service');
const { refirmarToken } = require('./auth.service');
const ErrorHttp = require('../utils/ErrorHttp');

const CAMPOS = ['telefono', 'biografia', 'instagram', 'linkedin', 'sitioWeb', 'foto'];
const incluir = { rol: true, datosCuenta: true };
function respuesta(u) {
  return {
    usuario: { id: u.id, nombre: u.nombre, correo: u.correo, rol: u.rol.nombre, rolConfirmado: u.rolConfirmado === true },
    cuenta: {
      nombre: u.nombre, correo: u.correo, fechaRegistro: u.fechaRegistro,
      telefono: u.datosCuenta?.telefono ?? '', biografia: u.datosCuenta?.biografia ?? '',
      instagram: u.datosCuenta?.instagram ?? '', linkedin: u.datosCuenta?.linkedin ?? '', sitioWeb: u.datosCuenta?.sitioWeb ?? '',
      foto: u.datosCuenta?.foto ?? null, tienePassword: Boolean(u.passwordHash), tieneGoogle: Boolean(u.googleId),
    },
  };
}
async function obtener(id) {
  const usuario = await prisma.usuario.findUnique({ where: { id }, include: incluir });
  if (!usuario) throw new ErrorHttp(401, 'La cuenta ya no está disponible');
  return respuesta(usuario);
}

async function guardar(id, datos, vencimiento) {
  const anterior = await prisma.usuario.findUnique({ where: { id }, include: incluir });
  if (!anterior) throw new ErrorHttp(401, 'La cuenta ya no está disponible');
  const cambiaCorreo = datos.correo !== undefined && datos.correo !== anterior.correo;
  if (cambiaCorreo) {
    let confirmada = false;
    if (datos.password && anterior.passwordHash) confirmada = await bcrypt.compare(datos.password, anterior.passwordHash);
    if (!confirmada && datos.credencial && anterior.googleId) {
      try { confirmada = (await google.verificarCredencial(datos.credencial)).googleId === anterior.googleId; }
      catch { confirmada = false; }
    }
    if (!confirmada) throw new ErrorHttp(400, 'Confirma tu identidad para cambiar el correo', { password: 'Confirma tu contraseña actual o usa tu cuenta de Google vinculada' });
  }
  const contacto = Object.fromEntries(CAMPOS.filter((c) => datos[c] !== undefined).map((c) => [c, datos[c] || null]));
  try {
    const actual = await prisma.$transaction(async (tx) => {
      // Serializa los cambios de cuenta; una comprobación de identidad no puede aplicarse a otra versión de la cuenta.
      const [vigente] = await tx.$queryRaw`SELECT version_sesion AS versionSesion FROM usuarios WHERE id = ${id} FOR UPDATE`;
      if (!vigente || vigente.versionSesion !== anterior.versionSesion) throw new ErrorHttp(409, 'Tu cuenta cambió. Vuelve a cargar el perfil antes de guardar');
      const data = {
        ...(datos.nombre !== undefined && { nombre: datos.nombre }),
        ...(cambiaCorreo && { correo: datos.correo, versionSesion: { increment: 1 } }),
        ...(Object.keys(contacto).length && { datosCuenta: { upsert: { create: contacto, update: contacto } } }),
      };
      const u = await tx.usuario.update({ where: { id }, data, include: incluir });
      if (cambiaCorreo) await tx.tokenRecuperacion.deleteMany({ where: { usuarioId: id } });
      return u;
    });
    return { ...respuesta(actual), ...(cambiaCorreo && { token: refirmarToken(actual, vencimiento) }) };
  } catch (error) {
    if (error.code === 'P2002') throw new ErrorHttp(409, 'No se puede usar ese correo', { correo: 'Ya existe una cuenta con ese correo' });
    throw error;
  }
}

const preferencias = { recordatoriosCitas: true, avisosMensajesCorreo: true };

async function obtenerPreferencias(id) {
  const configuracion = await prisma.usuario.findUnique({ where: { id }, select: preferencias });
  if (!configuracion) throw new ErrorHttp(401, 'La cuenta ya no está disponible');
  return { configuracion };
}

async function guardarPreferencias(id, datos) {
  const entradas = Object.entries(datos ?? {}).filter(([clave]) => Object.hasOwn(preferencias, clave));
  if (!entradas.length || entradas.some(([, valor]) => typeof valor !== 'boolean')) {
    throw new ErrorHttp(400, 'Indica qué aviso quieres activar o desactivar');
  }
  const configuracion = await prisma.usuario.update({ where: { id }, data: Object.fromEntries(entradas), select: preferencias });
  return { configuracion };
}

module.exports = { obtener, guardar, obtenerPreferencias, guardarPreferencias };

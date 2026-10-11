const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const modelo = require('../models/verificacion.model');
const ErrorHttp = require('../utils/ErrorHttp');

const carpeta = path.resolve(process.env.VERIFICATION_STORAGE_DIR || path.join(__dirname, '../../storage/verificaciones'));
const tipos = ['identidad', 'titulo', 'antecedentes'];
function detectarMime(buffer) {
  if (buffer.subarray(0, 5).toString() === '%PDF-') return 'application/pdf';
  if (buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return 'image/png';
  if (buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255) return 'image/jpeg';
  throw new ErrorHttp(400, 'Adjunta un PDF, JPG o PNG válido');
}
async function guardar(usuarioId, tipo, nombre, buffer) {
  if (!tipos.includes(tipo) || typeof nombre !== 'string' || !nombre.trim() || nombre.length > 150) throw new ErrorHttp(400, 'Revisa el tipo y nombre del documento');
  if (!Buffer.isBuffer(buffer) || !buffer.length || buffer.length > 5 * 1024 * 1024) throw new ErrorHttp(400, 'El documento debe pesar entre 1 byte y 5 MB');
  const mime = detectarMime(buffer);
  const clave = `${randomUUID()}.data`;
  await fs.mkdir(carpeta, { recursive: true });
  const archivo = path.join(carpeta, clave);
  await fs.writeFile(archivo, buffer, { flag: 'wx', mode: 0o600 });
  const nombreSeguro = [...nombre].filter((c) => c.codePointAt(0) >= 32 && c.codePointAt(0) !== 127).join('').trim();
  if (!nombreSeguro) { await fs.unlink(archivo); throw new ErrorHttp(400, 'Indica un nombre válido para el documento'); }
  try { return await modelo.guardarDocumento(usuarioId, { tipo, nombre: nombreSeguro, mime, clave, tamano: buffer.length }); }
  catch (error) { await fs.unlink(archivo).catch(() => {}); throw error; }
}
async function descargar(id, usuario) {
  const documento = await modelo.buscarDocumento(id);
  if (!documento) throw new ErrorHttp(404, 'No encontramos este documento');
  if (usuario.rol !== 'administrador' && (usuario.rol !== 'profesional' || documento.profesional.usuarioId !== usuario.id)) throw new ErrorHttp(403, 'No tienes permisos para ver este documento');
  if (!/^[a-f0-9-]{36}\.data$/.test(documento.clave)) throw new ErrorHttp(404, 'El documento no está disponible');
  try { return { documento, buffer: await fs.readFile(path.join(carpeta, documento.clave)) }; }
  catch (error) { if (error.code === 'ENOENT') throw new ErrorHttp(404, 'El documento no está disponible'); throw error; }
}
module.exports = { guardar, descargar, detectarMime };

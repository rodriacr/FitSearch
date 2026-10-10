const prisma = require('./prisma');
const ErrorHttp = require('../utils/ErrorHttp');

const documentoPublico = { id: true, tipo: true, nombre: true, mime: true, tamano: true, fechaCreacion: true };
const seleccion = {
  id: true, usuarioId: true, verificado: true, estadoVerificacion: true, motivoRechazo: true,
  historialVerificacion: true, revisionVerificacion: true, rut: true, telefono: true,
  usuario: { select: { activo: true } },
  documentos: { select: documentoPublico, orderBy: [{ fechaCreacion: 'desc' }, { id: 'desc' }] },
};
function buscarPorUsuario(usuarioId) { return prisma.profesional.findUnique({ where: { usuarioId }, select: seleccion }); }
function buscarPorId(id) { return prisma.profesional.findUnique({ where: { id }, select: seleccion }); }
function buscarDocumento(id) { return prisma.documentoProfesional.findUnique({ where: { id }, include: { profesional: { select: { usuarioId: true } } } }); }
function documentosActuales(ficha) {
  const reinicio = Math.max(0, ...(ficha.historialVerificacion || []).filter((evento) => ['rechazar', 'revocar'].includes(evento.accion)).map((evento) => Date.parse(evento.fecha) || 0));
  const ordenados = [...(ficha.documentos || [])].filter((documento) => !reinicio || new Date(documento.fechaCreacion).getTime() > reinicio)
    .sort((a, b) => (new Date(b.fechaCreacion).getTime() || 0) - (new Date(a.fechaCreacion).getTime() || 0) || b.id - a.id);
  const tipos = new Set();
  return ordenados.filter((documento) => {
    if (tipos.has(documento.tipo)) return false;
    tipos.add(documento.tipo);
    return true;
  });
}
function exigirDocumentos(ficha) {
  if (!['identidad', 'titulo'].every((tipo) => documentosActuales(ficha).some((d) => d.tipo === tipo))) {
    throw new ErrorHttp(409, 'Faltan el documento de identidad y/o el título profesional');
  }
  if (!ficha.rut) throw new ErrorHttp(409, 'El profesional debe completar su RUT y enviar su solicitud');
}
function historial(ficha, evento) { return [...(Array.isArray(ficha.historialVerificacion) ? ficha.historialVerificacion : []), { ...evento, fecha: new Date().toISOString() }]; }
async function actualizar(tx, ficha, datos) {
  const cambio = await tx.profesional.updateMany({ where: { id: ficha.id, revisionVerificacion: ficha.revisionVerificacion }, data: { ...datos, revisionVerificacion: { increment: 1 } } });
  if (!cambio.count) throw new ErrorHttp(409, 'La ficha cambió durante la revisión. Actualiza la pantalla e inténtalo nuevamente');
}
async function decidir(id, { accion, motivo = '', administradorId, revision }) {
  if (!['aprobar', 'rechazar', 'revocar'].includes(accion) || (accion !== 'aprobar' && (motivo.trim().length < 5 || motivo.length > 500))) throw new ErrorHttp(400, 'Indica una decisión válida y un motivo de al menos cinco caracteres');
  return prisma.$transaction(async (tx) => {
    const ficha = await tx.profesional.findUnique({ where: { id }, select: seleccion });
    if (!ficha) throw new ErrorHttp(404, 'No encontramos este profesional');
    if (!ficha.usuario.activo) throw new ErrorHttp(409, 'No se puede revisar una cuenta desactivada');
    if (revision !== undefined && revision !== ficha.revisionVerificacion) throw new ErrorHttp(409, 'La ficha cambió. Actualiza la pantalla antes de decidir');
    if (accion === 'aprobar' && ficha.verificado) return { id, verificado: true };
    if (accion === 'aprobar') exigirDocumentos(ficha);
    if (accion === 'rechazar' && ficha.verificado) throw new ErrorHttp(409, 'Para retirar una verificación usa Revocar');
    if (accion === 'revocar' && !ficha.verificado) throw new ErrorHttp(409, 'Este perfil no está verificado');
    const verificado = accion === 'aprobar';
    await actualizar(tx, ficha, {
      verificado, estadoVerificacion: verificado ? 'verificado' : 'rechazado', motivoRechazo: verificado ? null : motivo,
      historialVerificacion: historial(ficha, { accion, motivo: verificado ? null : motivo, administradorId }),
    });
    return { id, verificado };
  });
}
async function guardarDocumento(usuarioId, datos) {
  return prisma.$transaction(async (tx) => {
    const ficha = await tx.profesional.findUnique({ where: { usuarioId }, select: seleccion });
    if (!ficha) throw new ErrorHttp(409, 'Completa tu ficha profesional antes de adjuntar documentos');
    if (ficha.verificado) throw new ErrorHttp(409, 'La ficha ya está verificada; contacta al administrador si debes corregir documentos');
    const total = await tx.documentoProfesional.count({ where: { profesionalId: ficha.id } });
    if (total >= 20) throw new ErrorHttp(409, 'Alcanzaste el límite de documentos. Contacta al administrador');
    const documento = await tx.documentoProfesional.create({ data: { ...datos, profesionalId: ficha.id }, select: documentoPublico });
    await actualizar(tx, ficha, { historialVerificacion: historial(ficha, { accion: 'documento', tipo: datos.tipo, documentoId: documento.id }) });
    return documento;
  });
}
async function enviarSolicitud(usuarioId, { rut, telefono }) {
  return prisma.$transaction(async (tx) => {
    const ficha = await tx.profesional.findUnique({ where: { usuarioId }, select: seleccion });
    if (!ficha) throw new ErrorHttp(409, 'Completa tu ficha profesional primero');
    if (ficha.verificado) throw new ErrorHttp(409, 'Tu perfil ya está verificado');
    exigirDocumentos({ ...ficha, rut });
    await actualizar(tx, ficha, { rut, telefono, estadoVerificacion: 'pendiente', motivoRechazo: null, historialVerificacion: historial(ficha, { accion: 'solicitud' }) });
    return { estado: 'pendiente' };
  });
}
module.exports = { buscarPorUsuario, buscarPorId, buscarDocumento, decidir, guardarDocumento, enviarSolicitud, documentoPublico, documentosActuales };

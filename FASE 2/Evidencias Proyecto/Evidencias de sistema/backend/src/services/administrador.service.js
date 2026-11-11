const modelo = require('../models/administrador.model');
const { documentosActuales, decidir } = require('../models/verificacion.model');
const ErrorHttp = require('../utils/ErrorHttp');

function usuario(fila) {
  return { id: fila.id, nombre: fila.nombre, correo: fila.correo, activo: fila.activo, rol: fila.rol.nombre, fechaRegistro: fila.fechaRegistro.toISOString() };
}
const DIA_MS = 86400000;
const ultimaSolicitud = (historial) => (Array.isArray(historial) ? historial : [])
  .filter((evento) => evento.accion === 'solicitud' && evento.fecha).map((evento) => evento.fecha).sort().at(-1) ?? null;

function profesional(fila, ahora = new Date()) {
  const solicitadoEl = fila.historialVerificacion === undefined ? undefined : ultimaSolicitud(fila.historialVerificacion);
  return {
    // Cola de verificación: cuándo pidió la verificación, cuántos días lleva esperando y cuántos documentos adjuntó.
    ...(solicitadoEl !== undefined && {
      solicitadoEl,
      diasEsperando: solicitadoEl && fila.estadoVerificacion === 'pendiente' ? Math.max(0, Math.floor((ahora - new Date(solicitadoEl)) / DIA_MS)) : null,
    }),
    ...(fila._count && { documentos: fila._count.documentos }),
    // Directorio: calificación promedio y reservas no canceladas.
    ...(fila.calificacion !== undefined && {
      calificacion: fila.calificacion && { promedio: Math.round(fila.calificacion.promedio * 10) / 10, total: fila.calificacion.total },
      reservas: fila.reservas,
    }),
    id: fila.id, nombre: fila.usuario.nombre, correo: fila.usuario.correo,
    especialidad: fila.especialidad, descripcion: fila.descripcion, comuna: fila.comuna,
    modalidad: fila.modalidad, verificado: fila.verificado,
    estado: fila.estadoVerificacion || (fila.verificado ? 'verificado' : 'sin_solicitud'), activo: fila.usuario.activo,
    motivoRechazo: fila.estadoVerificacion === 'sin_solicitud' ? null : fila.motivoRechazo,
    revision: fila.revisionVerificacion, rut: fila.rut, telefono: fila.telefono,
  };
}
async function listado(consulta, convertir, parametros) {
  const { filas, total } = await consulta(parametros);
  return { resultados: filas.map(convertir), total, pagina: parametros.pagina, totalPaginas: Math.ceil(total / parametros.limite) };
}
const listarUsuarios = (parametros) => listado(modelo.listarUsuarios, usuario, parametros);
// La cola de verificaciones se ordena por antigüedad de la solicitud (la más antigua primero) y se pagina aquí.
async function listarProfesionales(parametros) {
  if (parametros.vista !== 'cola') return listado(modelo.listarProfesionales, profesional, parametros);
  const { filas } = await modelo.listarProfesionales(parametros);
  const orden = filas.map((fila) => profesional(fila)).sort((a, b) => (a.solicitadoEl ?? '9999').localeCompare(b.solicitadoEl ?? '9999'));
  const inicio = (parametros.pagina - 1) * parametros.limite;
  return { resultados: orden.slice(inicio, inicio + parametros.limite), total: orden.length, pagina: parametros.pagina, totalPaginas: Math.ceil(orden.length / parametros.limite) };
}
async function detalleProfesional(id) {
  const fila = await modelo.detalleProfesional(id);
  if (!fila) throw new ErrorHttp(404, 'No encontramos este profesional');
  return { profesional: { ...profesional(fila), documentos: documentosActuales(fila), historial: fila.historialVerificacion || [] } };
}
const decidirVerificacion = (id, datos) => decidir(id, datos);

module.exports = { decidirVerificacion, listarUsuarios, listarProfesionales, detalleProfesional, cambiarEstadoUsuario: modelo.cambiarEstadoUsuario };

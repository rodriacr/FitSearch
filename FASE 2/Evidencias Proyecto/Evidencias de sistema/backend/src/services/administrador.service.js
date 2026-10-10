const modelo = require('../models/administrador.model');
const { documentosActuales } = require('../models/verificacion.model');
const ErrorHttp = require('../utils/ErrorHttp');

function usuario(fila) {
  return { id: fila.id, nombre: fila.nombre, correo: fila.correo, activo: fila.activo, rol: fila.rol.nombre, fechaRegistro: fila.fechaRegistro.toISOString() };
}
function profesional(fila) {
  return {
    id: fila.id, nombre: fila.usuario.nombre, correo: fila.usuario.correo,
    especialidad: fila.especialidad, descripcion: fila.descripcion, comuna: fila.comuna,
    modalidad: fila.modalidad, verificado: fila.verificado,
    estado: fila.estadoVerificacion || (fila.verificado ? 'verificado' : 'pendiente'), activo: fila.usuario.activo,
    motivoRechazo: fila.motivoRechazo, revision: fila.revisionVerificacion, rut: fila.rut, telefono: fila.telefono,
  };
}
async function listado(consulta, convertir, parametros) {
  const { filas, total } = await consulta(parametros);
  return { resultados: filas.map(convertir), total, pagina: parametros.pagina, totalPaginas: Math.ceil(total / parametros.limite) };
}
const listarUsuarios = (parametros) => listado(modelo.listarUsuarios, usuario, parametros);
const listarProfesionales = (parametros) => listado(modelo.listarProfesionales, profesional, parametros);
async function detalleProfesional(id) {
  const fila = await modelo.detalleProfesional(id);
  if (!fila) throw new ErrorHttp(404, 'No encontramos este profesional');
  return { profesional: { ...profesional(fila), documentos: documentosActuales(fila), historial: fila.historialVerificacion || [] } };
}
async function resumen(dias, ahora = new Date()) {
  const hasta = new Date(Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth(), ahora.getUTCDate() + 1));
  const desde = new Date(hasta.getTime() - dias * 86400000);
  const { registros, ...conteos } = await modelo.resumen(desde, hasta);
  return {
    ...conteos, desde: desde.toISOString().slice(0, 10), hasta: new Date(hasta.getTime() - 1).toISOString().slice(0, 10),
    registros: registros.map((fila) => ({ fecha: new Date(fila.fecha).toISOString().slice(0, 10), rol: fila.rol, cantidad: Number(fila.cantidad) })),
  };
}
module.exports = { listarUsuarios, listarProfesionales, detalleProfesional, resumen, cambiarEstadoUsuario: modelo.cambiarEstadoUsuario };

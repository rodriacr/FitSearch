const modelo = require('../models/verificacion.model');

async function obtenerSolicitud(usuarioId) {
  const fila = await modelo.buscarPorUsuario(usuarioId);
  return { solicitud: fila && {
    id: fila.id, estado: fila.estadoVerificacion, motivo: fila.motivoRechazo,
    rut: fila.rut, telefono: fila.telefono,
    documentos: modelo.documentosActuales(fila), historial: fila.historialVerificacion || [],
  } };
}
const enviarSolicitud = (usuarioId, datos) => modelo.enviarSolicitud(usuarioId, datos);
module.exports = { obtenerSolicitud, enviarSolicitud };

const ErrorHttp = require('../utils/ErrorHttp');

function rutaNoEncontrada(req, res, next) {
  next(new ErrorHttp(404, 'Recurso no encontrado'));
}

// eslint-disable-next-line no-unused-vars
function manejoErrores(error, req, res, next) {
  if (error instanceof ErrorHttp) {
    const cuerpo = { error: error.message };
    if (error.detalles) cuerpo.detalles = error.detalles;
    return res.status(error.estado).json(cuerpo);
  }
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'El cuerpo de la petición no es un JSON válido' });
  }
  if (error.type === 'entity.too.large') return res.status(413).json({ error: 'El archivo supera el tamaño permitido' });
  console.error(error);
  return res.status(500).json({ error: 'Ocurrió un error inesperado. Intenta nuevamente más tarde' });
}

module.exports = { rutaNoEncontrada, manejoErrores };

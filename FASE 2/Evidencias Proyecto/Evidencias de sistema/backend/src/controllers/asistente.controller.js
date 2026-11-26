const servicio = require('../services/asistente.service');

// Respuesta en vivo (SC-47): si el navegador la pide (Accept: text/event-stream), el texto llega por partes como eventos
// «texto» y termina con un evento «fin» con lo mismo que entrega la respuesta normal. Los encabezados se envían recién
// con la primera parte del texto: el límite diario, una conversación ajena o un proveedor caído se informan con la
// respuesta JSON de siempre. Si algo falla después, llega un evento «error» y el mensaje no se guarda.
const pideEnVivo = (req) => (req.get('accept') ?? '').includes('text/event-stream');

async function responderEnVivo(res, trabajo) {
  let abierta = false;
  const evento = (nombre, datos) => res.write(`event: ${nombre}\ndata: ${JSON.stringify(datos)}\n\n`);
  const abrir = () => {
    if (abierta) return;
    abierta = true;
    // X-Accel-Buffering: que Nginx (Docker) entregue cada parte apenas llega, sin juntarlas.
    res.status(200).set({ 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache, no-transform', 'X-Accel-Buffering': 'no' });
    res.flushHeaders();
  };
  try {
    const resultado = await trabajo((texto) => {
      abrir();
      evento('texto', { texto });
    });
    abrir();
    evento('fin', resultado);
    res.end();
  } catch (error) {
    if (!abierta) throw error;
    // Solo los errores de negocio muestran su mensaje; cualquier otro, uno general (como el middleware de errores).
    evento('error', error.estado ? { estado: error.estado, error: error.message } : { estado: 500, error: 'Ocurrió un error inesperado' });
    res.end();
  }
}

async function estado(req, res) { res.json(await servicio.estado(req.usuario.id)); }
async function guardarPermisoPerfil(req, res) { res.json(await servicio.guardarPermisoPerfil(req.usuario.id, req.body.permiso)); }
async function listar(req, res) { res.json(await servicio.listar(req.usuario.id)); }
async function obtener(req, res) { res.json(await servicio.obtener(req.usuario.id, Number(req.params.id))); }
async function iniciar(req, res) {
  if (pideEnVivo(req)) return responderEnVivo(res, (alTexto) => servicio.iniciar(req.usuario.id, req.body.mensaje, new Date(), alTexto));
  return res.status(201).json(await servicio.iniciar(req.usuario.id, req.body.mensaje));
}
async function enviar(req, res) {
  const id = Number(req.params.id);
  if (pideEnVivo(req)) return responderEnVivo(res, (alTexto) => servicio.enviar(req.usuario.id, id, req.body.mensaje, new Date(), alTexto));
  return res.status(201).json(await servicio.enviar(req.usuario.id, id, req.body.mensaje));
}
async function fijar(req, res) { res.json(await servicio.fijar(req.usuario.id, Number(req.params.id), req.body.fijada)); }
async function eliminar(req, res) {
  await servicio.eliminar(req.usuario.id, Number(req.params.id));
  res.status(204).end();
}
// SC-47: valoración de una respuesta y modalidad u orden elegidos en la tarjeta de la recomendación.
async function actualizarMensaje(req, res) {
  const { valoracion, modalidad, criterio } = req.body;
  res.json(await servicio.actualizarMensaje(req.usuario.id, Number(req.params.id), { valoracion, modalidad, criterio }));
}

module.exports = { estado, guardarPermisoPerfil, listar, obtener, iniciar, enviar, fijar, eliminar, actualizarMensaje };

const { Router, raw } = require('express');
const { body, param, query, matchedData } = require('express-validator');
const { autenticar, autorizarRoles } = require('../middlewares/autenticar');
const validar = require('../middlewares/validar');
const modelo = require('../models/verificacion.model');
const documentos = require('../services/documento.service');
const ErrorHttp = require('../utils/ErrorHttp');

function rutValido(valor) {
  if (!/^\d{7,8}-[\dK]$/.test(valor)) return false;
  const [numero, digito] = valor.split('-');
  let suma = 0;
  [...numero].reverse().forEach((n, i) => { suma += Number(n) * (2 + i % 6); });
  const calculado = 11 - suma % 11;
  return digito === (calculado === 11 ? '0' : calculado === 10 ? 'K' : String(calculado));
}
const router = Router();
router.use(autenticar);
router.get('/mi-solicitud', autorizarRoles('profesional'), async (req, res) => {
  const fila = await modelo.buscarPorUsuario(req.usuario.id);
  res.json({ solicitud: fila && { id: fila.id, estado: fila.estadoVerificacion, motivo: fila.motivoRechazo, rut: fila.rut, telefono: fila.telefono, documentos: fila.documentos, historial: fila.historialVerificacion || [] } });
});
router.post('/mi-solicitud', autorizarRoles('profesional'),
  body('rut').isString().bail().trim().customSanitizer((v) => v.replace(/\./g, '').toUpperCase()).custom(rutValido).withMessage('Ingresa un RUT válido, con guion y dígito verificador'),
  body('telefono').optional({ values: 'falsy' }).isString().bail().trim().matches(/^\+?[\d\s-]{8,20}$/).withMessage('Ingresa un teléfono válido'), validar,
  async (req, res) => res.json(await modelo.enviarSolicitud(req.usuario.id, { telefono: null, ...matchedData(req) })));
router.post('/documentos', autorizarRoles('profesional'),
  query('tipo').isIn(['identidad', 'titulo', 'antecedentes']), query('nombre').isString().bail().trim().isLength({ min: 1, max: 150 }), validar,
  raw({ type: ['application/pdf', 'image/jpeg', 'image/png', 'application/octet-stream'], limit: '5mb' }),
  async (req, res) => {
    if (!Buffer.isBuffer(req.body)) throw new ErrorHttp(400, 'Envía el archivo como PDF, JPG o PNG');
    const datos = matchedData(req);
    res.status(201).json({ documento: await documentos.guardar(req.usuario.id, datos.tipo, datos.nombre, req.body) });
  });
router.get('/documentos/:id', param('id').isInt({ min: 1 }).toInt(), validar, async (req, res) => {
  const { documento, buffer } = await documentos.descargar(matchedData(req).id, req.usuario);
  res.set({ 'Content-Type': documento.mime, 'Content-Disposition': `attachment; filename="documento-${documento.id}"; filename*=UTF-8''${encodeURIComponent(documento.nombre).replace(/'/g, '%27')}`, 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' }).send(buffer);
});
module.exports = router;

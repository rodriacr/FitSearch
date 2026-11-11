// Chat entre un usuario y un profesional (FS-HU-31): solo los dos participantes.
const { Router } = require('express');
const { param, body, matchedData } = require('express-validator');
const { autenticar, autorizarRoles } = require('../middlewares/autenticar');
const validar = require('../middlewares/validar');
const servicio = require('../services/chat.service');

const router = Router();
router.use(autenticar, autorizarRoles('usuario', 'profesional'));
const id = param('id').isInt({ min: 1, max: 2147483647 }).withMessage('La conversación indicada no es válida').toInt();

router.get('/', async (req, res) => res.json(await servicio.listar(req.usuario)));
router.get('/no-leidos', async (req, res) => res.json(await servicio.noLeidos(req.usuario)));
// Abre (o crea) el chat de la pareja de una reserva, para los enlaces desde Mis citas, la agenda y la ficha.
router.post('/', body('reservaId').isInt({ min: 1, max: 2147483647 }).withMessage('La reserva indicada no es válida').toInt(), validar,
  async (req, res) => res.json(await servicio.deReserva(req.usuario, matchedData(req).reservaId)));
router.get('/:id', id, validar, async (req, res) => res.json(await servicio.abrir(req.usuario, matchedData(req).id)));
router.post('/:id/mensajes', id, body('texto').isString().withMessage('Escribe un mensaje'), validar,
  async (req, res) => res.status(201).json(await servicio.enviar(req.usuario, matchedData(req).id, req.body.texto)));
// Elimina el chat solo para quien lo pide.
router.delete('/:id', id, validar, async (req, res) => res.json(await servicio.eliminar(req.usuario, matchedData(req).id)));

module.exports = router;

const { Router } = require('express');
const { param, body, matchedData } = require('express-validator');
const { autenticar, autorizarRoles } = require('../middlewares/autenticar');
const validar = require('../middlewares/validar');
const servicio = require('../services/agenda.service');
const router = Router();
router.use(['/disponibilidades', '/reservas'], autenticar);
const id = () => param('id').isInt({ min: 1, max: 2147483647 }).toInt();
const bloque = [
  body('fecha').isString(),
  body('horaInicio').isString(),
  body('horaFin').isString(),
];
router.get(
  '/disponibilidades',
  autorizarRoles('profesional'),
  async (req, res) =>
    res.json(await servicio.listarDisponibilidad(req.usuario)),
);
router.post(
  '/disponibilidades',
  autorizarRoles('profesional'),
  bloque,
  validar,
  async (req, res) =>
    res
      .status(201)
      .json(
        await servicio.guardarDisponibilidad(
          req.usuario.id,
          null,
          matchedData(req),
        ),
      ),
);
router.put(
  '/disponibilidades/:id',
  autorizarRoles('profesional'),
  id(),
  bloque,
  validar,
  async (req, res) => {
    const { id, ...datos } = matchedData(req);
    res.json(await servicio.guardarDisponibilidad(req.usuario.id, id, datos));
  },
);
router.delete(
  '/disponibilidades/:id',
  autorizarRoles('profesional'),
  id(),
  validar,
  async (req, res) =>
    res.json(
      await servicio.eliminarDisponibilidad(
        req.usuario.id,
        matchedData(req).id,
      ),
    ),
);
router.get(
  '/reservas',
  autorizarRoles('usuario', 'profesional'),
  async (req, res) => res.json(await servicio.listarReservas(req.usuario)),
);
router.post(
  '/reservas',
  autorizarRoles('usuario'),
  body('disponibilidadId').isInt({ min: 1, max: 2147483647 }).toInt(),
  body('mensaje').isString(),
  validar,
  async (req, res) =>
    res
      .status(201)
      .json(await servicio.crearReserva(req.usuario.id, matchedData(req))),
);
router.patch(
  '/reservas/:id',
  autorizarRoles('usuario', 'profesional'),
  id(),
  body('estado').isString(),
  validar,
  async (req, res) => {
    const { id, estado } = matchedData(req);
    res.json(await servicio.cambiarReserva(req.usuario, id, estado));
  },
);
module.exports = router;

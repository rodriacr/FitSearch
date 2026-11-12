const { Router } = require('express');
const { param, body, query, matchedData } = require('express-validator');
const { autenticar, autorizarRoles } = require('../middlewares/autenticar');
const validar = require('../middlewares/validar');
const servicio = require('../services/agenda.service');
const router = Router();
router.use(['/disponibilidades', '/reservas', '/agenda'], autenticar);
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
// Varios bloques de igual duración entre dos horas del mismo día.
router.post(
  '/disponibilidades/serie',
  autorizarRoles('profesional'),
  bloque,
  body('duracion').isInt({ min: 1, max: 600 }).withMessage('Elige la duración de cada bloque').toInt(),
  validar,
  async (req, res) =>
    res.status(201).json(await servicio.guardarSerie(req.usuario.id, matchedData(req))),
);
// Calendario semanal del profesional y fechas bloqueadas (mejoras del 09-11-2026).
router.get(
  '/agenda/semana',
  autorizarRoles('profesional'),
  query('desde').optional().isString(),
  validar,
  async (req, res) => res.json(await servicio.semana(req.usuario.id, matchedData(req).desde)),
);
router.get('/agenda/bloqueos', autorizarRoles('profesional'), async (req, res) =>
  res.json(await servicio.listarBloqueos(req.usuario.id)),
);
router.post(
  '/agenda/bloqueos',
  autorizarRoles('profesional'),
  body('fechaInicio').isString(),
  body('fechaFin').isString(),
  body('motivo').optional({ values: 'null' }).isString(),
  validar,
  async (req, res) => res.status(201).json(await servicio.crearBloqueo(req.usuario.id, matchedData(req))),
);
router.delete('/agenda/bloqueos/:id', autorizarRoles('profesional'), id(), validar, async (req, res) =>
  res.json(await servicio.eliminarBloqueo(req.usuario.id, matchedData(req).id)),
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
  // Presencial u online cuando el profesional atiende de ambas formas, y si es la primera visita (09-11-2026).
  body('modalidad').optional().isString(),
  body('primeraVisita').optional().isBoolean().withMessage('Indica si es tu primera visita').toBoolean(true),
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

const { Router } = require('express');
const { matchedData } = require('express-validator');
const validar = require('../middlewares/validar');
const v = require('../validators/contenido.validators');
const servicio = require('../services/contenido.service');
const geocodificacion = require('../services/geocodificacion.service');

// Contenido del administrador (FS-HU-30): /api/administrador/contenido/{especialidades|alimentos|establecimientos}.
// La autenticación y el rol administrador los exige administrador.routes.
const router = Router();
router.get('/establecimientos/ubicacion', v.ubicacion, validar, async (req, res) => {
  const { comuna, direccion } = matchedData(req, { locations: ['query'] });
  res.json(await geocodificacion.ubicar({ comuna, direccion }));
});
router.get('/:catalogo', v.catalogo, v.listado, validar,
  async (req, res) => res.json(await servicio.listar(req.params.catalogo, matchedData(req, { locations: ['query'] }))));
router.post('/:catalogo', v.catalogo, v.datos, validar,
  async (req, res) => res.status(201).json(await servicio.crear(req.params.catalogo, matchedData(req, { locations: ['body'] }))));
router.put('/:catalogo/:id', v.catalogo, v.id, v.datos, validar,
  async (req, res) => res.json(await servicio.actualizar(req.params.catalogo, req.params.id, matchedData(req, { locations: ['body'] }))));
router.patch('/:catalogo/:id/estado', v.catalogo, v.id, v.estado, validar,
  async (req, res) => res.json(await servicio.cambiarEstado(req.params.catalogo, req.params.id, req.body.activo)));
router.delete('/:catalogo/:id', v.catalogo, v.id, validar, async (req, res) => {
  await servicio.eliminar(req.params.catalogo, req.params.id);
  res.status(204).end();
});
module.exports = router;

const { Router } = require('express');
const validar = require('../middlewares/validar');
const v = require('../validators/establecimiento.validators');
const servicio = require('../services/establecimiento.service');
const { autenticar, autorizarRoles } = require('../middlewares/autenticar');
const { profesionales: reglas } = require('../../../shared/reglas.json');

// Directorio de centros de salud y gimnasios (FS-HU-25): /api/establecimientos. Es del usuario, como el buscador de
// profesionales (DAS, D25). Los establecimientos los registra el administrador (FS-HU-30).
const router = Router();
router.use(autenticar, autorizarRoles('usuario'));

// Express 5 entrega req.query de solo lectura: los valores ya validados se normalizan aquí.
const texto = (valor) => (typeof valor === 'string' ? valor.trim() : '');
const entero = (valor, porDefecto) => (valor === undefined ? porDefecto : Number(valor));
// La ubicación se redondea a 3 decimales (unos 100 m): basta para la distancia y no se guarda en ninguna parte.
const coordenada = (valor) => Math.round(Number(valor) * 1000) / 1000;

const filtrosDesdeConsulta = (query) => ({
  categoria: query.categoria,
  comuna: texto(query.comuna),
  ubicacion: query.lat === undefined ? null : { lat: coordenada(query.lat), lng: coordenada(query.lng) },
  distanciaKm: entero(query.distanciaKm, null),
  orden: query.orden || 'nombre',
  pagina: entero(query.pagina, 1),
  limite: entero(query.limite, reglas.porPagina),
});

router.get('/filtros', v.categoria, validar, async (req, res) => res.json(await servicio.filtros(req.query.categoria)));
router.get('/', v.listar, validar, async (req, res) => res.json(await servicio.listar(filtrosDesdeConsulta(req.query))));
router.get('/:id', v.id, validar, async (req, res) => res.json(await servicio.ficha(Number(req.params.id))));

module.exports = router;

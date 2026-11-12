const { Router } = require('express');
const controlador = require('../controllers/profesional.controller');
const resenas = require('../controllers/resena.controller');
const validadores = require('../validators/profesional.validators');
const validadoresFicha = require('../validators/ficha.validators');
const validar = require('../middlewares/validar');
const { autenticar, autorizarRoles } = require('../middlewares/autenticar');
const agenda = require('../services/agenda.service');
const cuenta = require('../services/cuentaProfesional.service');
const listaEspera = require('../services/listaEspera.service');

const router = Router();
router.use(autenticar);
// El buscador es del usuario (DAS, D25). La ficha pública por id la ve también el profesional (vista previa de la suya).
router.get('/filtros', autorizarRoles('usuario'), controlador.filtros);
// Ficha propia del profesional (FS-HU-04). Va antes de "/:id" para que "mi-ficha" no se lea como un id.
router.get('/mi-ficha', autorizarRoles('profesional'), controlador.obtenerMiFicha);
router.put('/mi-ficha', autorizarRoles('profesional'), validadoresFicha, validar, controlador.guardarMiFicha);
// SC-28: coordenadas de la comuna y la dirección que escribe en su ficha (el profesional ya no las ingresa a mano).
router.get('/mi-ficha/ubicacion', autorizarRoles('profesional'), validadores.ubicar, validar, controlador.ubicarDireccion);
// FS-HU-29: experiencia (se muestra en la ficha pública) y configuración de la cuenta profesional.
router.get('/mi-ficha/experiencia', autorizarRoles('profesional'), async (req, res) => res.json(await cuenta.obtenerExperiencia(req.usuario.id)));
router.put('/mi-ficha/experiencia', autorizarRoles('profesional'), async (req, res) => res.json(await cuenta.guardarExperiencia(req.usuario.id, req.body)));
router.get('/mi-ficha/configuracion', autorizarRoles('profesional'), async (req, res) => res.json(await cuenta.obtenerConfiguracion(req.usuario.id)));
router.put('/mi-ficha/configuracion', autorizarRoles('profesional'), async (req, res) => res.json(await cuenta.guardarConfiguracion(req.usuario.id, req.body)));
// FS-HU-12: Administrador verifica un perfil profesional
router.patch('/:id/verificar', autorizarRoles('administrador'), validadores.id(), validar, controlador.verificarPerfil);
router.get('/', autorizarRoles('usuario'), validadores.listar, validar, controlador.listar);
router.get('/:id', validadores.id(), validar, controlador.ficha);
router.get('/:id/disponibilidades', autorizarRoles('usuario', 'profesional'), validadores.id(), validar,
  async (req, res) => res.json(await agenda.listarDisponibilidad(req.usuario, Number(req.params.id))));
// «Avísame si se libera una hora» (09-11-2026): el usuario se anota o sale de la lista de espera de un profesional.
router.get('/:id/lista-espera', autorizarRoles('usuario'), validadores.id(), validar,
  async (req, res) => res.json(await listaEspera.estado(Number(req.params.id), req.usuario.id)));
router.post('/:id/lista-espera', autorizarRoles('usuario'), validadores.id(), validar,
  async (req, res) => res.status(201).json(await listaEspera.anotar(Number(req.params.id), req.usuario.id)));
router.delete('/:id/lista-espera', autorizarRoles('usuario'), validadores.id(), validar,
  async (req, res) => res.json(await listaEspera.salir(Number(req.params.id), req.usuario.id)));
// Reseñas (FS-HU-24): cualquiera con sesión las lee; solo las cuentas de usuario califican.
router.get('/:id/resenas', validadores.id(), validadores.pagina, validadores.tipoResena, validar, resenas.listar);
router.put('/:id/resenas', autorizarRoles('usuario'), validadores.id(), validadores.guardarResena, validar, resenas.guardar);
router.delete('/:id/resenas', autorizarRoles('usuario'), validadores.id(), validar, resenas.eliminar);

module.exports = router;

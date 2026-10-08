const servicio = require('../services/profesional.service');
const { profesionales: reglas } = require('../../../shared/reglas.json');

// Express 5 entrega req.query de solo lectura: los valores ya validados se normalizan aquí.
const texto = (valor) => (typeof valor === 'string' ? valor.trim() : '');
const entero = (valor, porDefecto) => (valor === undefined ? porDefecto : Number(valor));
// La ubicación se redondea a 3 decimales (unos 100 m): basta para la distancia y no se guarda en ninguna parte.
const coordenada = (valor) => Math.round(Number(valor) * 1000) / 1000;

function filtrosDesdeConsulta(query) {
  return {
    q: texto(query.q),
    especialidad: texto(query.especialidad),
    comuna: texto(query.comuna),
    modalidad: query.modalidad || '',
    calificacionMin: entero(query.calificacionMin, null),
    ubicacion: query.lat === undefined ? null : { lat: coordenada(query.lat), lng: coordenada(query.lng) },
    distanciaKm: entero(query.distanciaKm, null),
    orden: query.orden || 'nombre',
    pagina: entero(query.pagina, 1),
    limite: entero(query.limite, reglas.porPagina),
  };
}

// ==========================================
// FUNCIONES DEL EQUIPO (GITHUB)
// ==========================================
async function listar(req, res) {
  res.json(await servicio.listar({ ...filtrosDesdeConsulta(req.query), usuarioId: req.usuario.id }));
}
async function ficha(req, res) { res.json(await servicio.ficha(Number(req.params.id), req.usuario)); }
async function filtros(req, res) { res.json(await servicio.filtros()); }

// ==========================================
// FUNCIONES DE CLAUDE (INTEGRACIÓN)
// ==========================================
async function obtenerMiFicha(req, res) { 
  res.json(await servicio.obtenerMiFicha(req.usuario.id)); 
}
async function guardarMiFicha(req, res) {
  const { especialidad, descripcion, ubicacionLat, ubicacionLng } = req.body;
  res.json(await servicio.guardarMiFicha(req.usuario.id, { 
    especialidad, 
    descripcion: descripcion || null, 
    ubicacionLat, 
    ubicacionLng 
  }));
}

// Exportamos la mezcla de ambos mundos
module.exports = { 
  listar, 
  ficha, 
  filtros, 
  filtrosDesdeConsulta, 
  obtenerMiFicha, 
  guardarMiFicha 
};
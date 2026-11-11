// Validaciones del contenido del administrador (FS-HU-30). Los límites vienen de shared/reglas.json.
const { body, param, query } = require('express-validator');
const { contenido: reglas, profesionales: reglasProfesionales } = require('../../../shared/reglas.json');

const CATALOGOS = ['especialidades', 'alimentos', 'establecimientos'];
const { alimento: reglasAlimento, establecimiento: reglasEstablecimiento } = reglas;
const { latMin, latMax, lngMin, lngMax } = reglasProfesionales.ubicacionChile;
const conComa = (numero) => String(numero).replace('.', ',');
const unDecimal = (valor) => Math.round(valor * 10) / 10;

const catalogo = param('catalogo').isIn(CATALOGOS).withMessage('Ese catálogo no existe');
const id = param('id').isInt({ min: 1 }).withMessage('El elemento indicado no es válido').toInt();
const listado = [
  query('q').default('').isString().bail().trim().isLength({ max: reglas.busqueda.max }),
  query('estado').default('').isIn(['', 'activos', 'inactivos']).withMessage('Elige activos o inactivos'),
  query('pagina').default(1).isInt({ min: 1, max: 100000 }).toInt(),
  query('limite').default(reglas.porPagina).isInt({ min: 1, max: 50 }).toInt(),
];
const estado = body('activo').custom((valor) => typeof valor === 'boolean').withMessage('Indica si el elemento queda activo');

const texto = (campo, { min = 1, max }, mensajeVacio) => body(campo)
  .isString().withMessage(mensajeVacio).bail()
  .trim().notEmpty().withMessage(mensajeVacio).bail()
  .isLength({ min, max }).withMessage(`Escribe entre ${min} y ${max} caracteres`);
const numero = (campo, max, nombre) => body(campo)
  .notEmpty().withMessage(`Ingresa ${nombre}`).bail()
  .isFloat({ min: 0, max }).withMessage(`Ingresa ${nombre} entre 0 y ${max}`).bail()
  .toFloat().customSanitizer(unDecimal);

// Datos de cada catálogo al crear o editar.
const DATOS = {
  especialidades: [texto('nombre', reglasProfesionales.especialidad, 'Escribe el nombre de la especialidad')],
  alimentos: [
    texto('nombre', reglasAlimento.nombre, 'Escribe el nombre del alimento'),
    body('sinonimos').default('').isString().withMessage('Los sinónimos deben ser un texto').bail()
      .isLength({ max: reglasAlimento.sinonimos.max }).withMessage(`Los sinónimos admiten hasta ${reglasAlimento.sinonimos.max} caracteres`)
      // «pollo,  pechuga ,» queda «pollo, pechuga»: el buscador compara palabra por palabra.
      .customSanitizer((valor) => valor.split(',').map((parte) => parte.trim().replace(/\s+/g, ' ')).filter(Boolean).join(', ')),
    numero('calorias', reglasAlimento.caloriasMax, 'las calorías por 100 g'),
    numero('proteinasG', reglasAlimento.macronutrienteMax, 'las proteínas por 100 g'),
    numero('carbohidratosG', reglasAlimento.macronutrienteMax, 'los carbohidratos por 100 g'),
    numero('grasasG', reglasAlimento.macronutrienteMax, 'las grasas por 100 g')
      .custom((grasas, { req }) => {
        const suma = Number(req.body.proteinasG) + Number(req.body.carbohidratosG) + grasas;
        // Si otro valor no es un número, ya tiene su propio error.
        return Number.isNaN(suma) || suma <= reglasAlimento.macronutrienteMax;
      })
      .withMessage(`Las proteínas, los carbohidratos y las grasas no pueden sumar más de ${reglasAlimento.macronutrienteMax} g por cada 100 g`),
  ],
  establecimientos: [
    texto('nombre', reglasEstablecimiento.nombre, 'Escribe el nombre del establecimiento'),
    body('categoria').isIn(reglasEstablecimiento.categorias.map(({ valor }) => valor)).withMessage('Elige si es un centro de salud o un gimnasio'),
    texto('comuna', { max: reglasEstablecimiento.comuna.max }, 'Ingresa la comuna del establecimiento'),
    texto('direccion', { max: reglasEstablecimiento.direccion.max }, 'Ingresa la dirección del establecimiento'),
    body('ubicacionLat').notEmpty().withMessage('Busca la ubicación o ingresa la latitud').bail()
      .isFloat({ min: latMin, max: latMax }).withMessage(`La latitud debe estar en Chile (entre ${conComa(latMin)} y ${conComa(latMax)})`).toFloat(),
    body('ubicacionLng').notEmpty().withMessage('Busca la ubicación o ingresa la longitud').bail()
      .isFloat({ min: lngMin, max: lngMax }).withMessage(`La longitud debe estar en Chile (entre ${conComa(lngMin)} y ${conComa(lngMax)})`).toFloat(),
  ],
};

// Corre las validaciones del catálogo de la ruta; uno inexistente ya lo rechaza `catalogo`.
async function datos(req, res, siguiente) {
  try {
    await Promise.all((DATOS[req.params.catalogo] ?? []).map((cadena) => cadena.run(req)));
    siguiente();
  } catch (error) {
    siguiente(error);
  }
}

// Búsqueda de la ubicación de un establecimiento con su comuna y su dirección (Nominatim, como la ficha del profesional).
const ubicacion = [
  query('comuna').custom((valor) => typeof valor === 'string').withMessage('Ingresa la comuna del establecimiento').bail()
    .trim().notEmpty().withMessage('Ingresa la comuna del establecimiento').bail()
    .isLength({ max: reglasEstablecimiento.comuna.max }).withMessage(`La comuna admite hasta ${reglasEstablecimiento.comuna.max} caracteres`),
  query('direccion').default('').isString().withMessage('Indica una sola dirección').bail()
    .trim().isLength({ max: reglasEstablecimiento.direccion.max }).withMessage(`La dirección admite hasta ${reglasEstablecimiento.direccion.max} caracteres`),
];

module.exports = { catalogo, id, listado, estado, datos, ubicacion };

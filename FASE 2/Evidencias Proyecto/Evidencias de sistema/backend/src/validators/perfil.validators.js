const { body } = require('express-validator');
const { perfil, salud: catalogoSalud } = require('../../../shared/reglas.json');

const valores = (opciones) => opciones.map((opcion) => opcion.valor);
const valoresActividad = valores(perfil.actividadFisica);
const valoresSexo = valores(perfil.sexo);

// Tipo de cuenta del primer paso del asistente (FS-HU-02); el administrador nunca se puede elegir.
const tipoCuenta = [
  body('rol')
    .notEmpty().withMessage('Selecciona el tipo de cuenta').bail()
    .isIn(['usuario', 'profesional']).withMessage('Selecciona el tipo de cuenta'),
];

const actualizar = [
  body('pesoKg')
    .notEmpty().withMessage('El peso es obligatorio').bail()
    .isFloat({ min: perfil.pesoKg.min, max: perfil.pesoKg.max })
    .withMessage(`El peso debe estar entre ${perfil.pesoKg.min} y ${perfil.pesoKg.max} kg`)
    .toFloat(),
  body('alturaCm')
    .notEmpty().withMessage('La altura es obligatoria').bail()
    .isFloat({ min: perfil.alturaCm.min, max: perfil.alturaCm.max })
    .withMessage(`La altura debe estar entre ${perfil.alturaCm.min} y ${perfil.alturaCm.max} cm`)
    .toFloat(),
  body('edad')
    .notEmpty().withMessage('La edad es obligatoria').bail()
    .isInt({ min: perfil.edad.min, max: perfil.edad.max })
    .withMessage(`La edad debe ser un número entero entre ${perfil.edad.min} y ${perfil.edad.max} años`)
    .toInt(),
  body('sexo')
    .notEmpty().withMessage('El sexo es obligatorio para el cálculo nutricional').bail()
    .isIn(valoresSexo).withMessage('Selecciona una opción de sexo válida'),
  body('actividadFisica')
    .notEmpty().withMessage('El nivel de actividad física es obligatorio').bail()
    .isIn(valoresActividad).withMessage('Selecciona un nivel de actividad física válido'),
];

const objetivos = [
  body('objetivoPrincipal')
    .notEmpty().withMessage('Elige tu objetivo principal').bail()
    .isIn(valores(perfil.objetivoPrincipal)).withMessage('Selecciona un objetivo válido'),
  body('comidasDia')
    .notEmpty().withMessage('Indica cuántas comidas realizas al día').bail()
    .isInt().withMessage('Selecciona una cantidad de comidas válida').bail()
    .toInt()
    .isIn(valores(perfil.comidasDia)).withMessage('Selecciona una cantidad de comidas válida'),
  body('horasSueno')
    .notEmpty().withMessage('Indica tus horas de sueño promedio').bail()
    .isIn(valores(perfil.horasSueno)).withMessage('Selecciona un rango de horas de sueño válido'),
];

// Lista de opciones de un catálogo: sin repetidos y, si incluye "ninguna", no puede traer otras opciones.
const listaDeCatalogo = (campo, catalogo, { obligatoria, mensajeVacia }) =>
  body(campo).custom((lista) => {
    if (!Array.isArray(lista)) throw new Error('El formato de la respuesta no es válido');
    if (obligatoria && lista.length === 0) throw new Error(mensajeVacia);
    const permitidos = valores(catalogo);
    if (lista.some((valor) => !permitidos.includes(valor)) || new Set(lista).size !== lista.length) {
      throw new Error('Hay opciones no válidas');
    }
    if (lista.includes('ninguna') && lista.length > 1) throw new Error('"Ninguna" no se puede combinar con otras opciones');
    return true;
  });

const salud = [
  listaDeCatalogo('condicionesMedicas', catalogoSalud.condicionesMedicas,
    { obligatoria: true, mensajeVacia: 'Indica si tienes alguna condición médica (o marca "Ninguna")' }),
  body('tomaMedicamentos').isBoolean({ strict: true }).withMessage('Indica si tomas algún medicamento regularmente'),
  listaDeCatalogo('medicamentos', catalogoSalud.medicamentos, { obligatoria: false })
    .custom((lista, { req }) => {
      if (req.body.tomaMedicamentos === true && lista.length === 0) throw new Error('Indica qué tipo de medicamento tomas');
      if (req.body.tomaMedicamentos === false && lista.length > 0) throw new Error('No indiques medicamentos si respondiste que no tomas');
      return true;
    }),
  listaDeCatalogo('alergias', catalogoSalud.alergias,
    { obligatoria: true, mensajeVacia: 'Indica si tienes alergias (o marca "Ninguna")' }),
];

module.exports = { tipoCuenta, actualizar, objetivos, salud };

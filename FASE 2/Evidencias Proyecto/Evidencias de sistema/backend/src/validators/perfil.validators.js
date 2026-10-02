const { body } = require('express-validator');
const { perfil } = require('../../../shared/reglas.json');

const valoresActividad = perfil.actividadFisica.map((opcion) => opcion.valor);
const valoresSexo = perfil.sexo.map((opcion) => opcion.valor);

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

module.exports = { actualizar };

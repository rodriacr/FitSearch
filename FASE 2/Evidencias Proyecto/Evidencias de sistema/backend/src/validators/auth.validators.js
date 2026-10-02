const { body } = require('express-validator');
const { usuario } = require('../../../shared/reglas.json');

const correo = () =>
  body('correo')
    .trim()
    .notEmpty().withMessage('El correo es obligatorio').bail()
    .isLength({ max: usuario.correo.max }).withMessage(`El correo no puede superar ${usuario.correo.max} caracteres`).bail()
    .isEmail().withMessage('Ingresa un correo válido')
    .toLowerCase();

const registro = [
  body('nombre')
    .trim()
    .notEmpty().withMessage('El nombre es obligatorio').bail()
    .isLength({ min: usuario.nombre.min, max: usuario.nombre.max })
    .withMessage(`El nombre debe tener entre ${usuario.nombre.min} y ${usuario.nombre.max} caracteres`),
  correo(),
  body('password')
    .notEmpty().withMessage('La contraseña es obligatoria').bail()
    .isLength({ min: usuario.password.min, max: usuario.password.max })
    .withMessage(`La contraseña debe tener entre ${usuario.password.min} y ${usuario.password.max} caracteres`),
];

const inicioSesion = [
  correo(),
  body('password').notEmpty().withMessage('La contraseña es obligatoria'),
];

module.exports = { registro, inicioSesion };

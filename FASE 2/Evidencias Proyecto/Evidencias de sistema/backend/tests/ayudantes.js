// Datos y utilidades compartidas por las pruebas.
const bcrypt = require('bcryptjs');

const PASSWORD = 'ClaveSegura123';

function usuarioDePrueba(sobrescribir = {}) {
  return {
    id: 1,
    nombre: 'Ana Pérez',
    correo: 'ana@correo.cl',
    passwordHash: bcrypt.hashSync(PASSWORD, 4),
    rolId: 1,
    rolConfirmado: false,
    fechaRegistro: new Date('2026-09-14T10:00:00Z'),
    rol: { id: 1, nombre: 'usuario' },
    perfil: { id: 1, usuarioId: 1, pesoKg: null, alturaCm: null, edad: null, sexo: null, actividadFisica: null },
    ...sobrescribir,
  };
}

module.exports = { PASSWORD, usuarioDePrueba };

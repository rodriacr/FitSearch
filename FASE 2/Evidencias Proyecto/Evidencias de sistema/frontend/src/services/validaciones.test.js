import { describe, expect, test } from 'vitest';
import { validarInicioSesion, validarPerfil, validarRegistro } from './validaciones.js';

describe('validaciones', () => {
  test('registro válido no tiene errores', () => {
    expect(validarRegistro({ nombre: 'Ana Pérez', correo: 'ana@correo.cl', password: 'ClaveSegura123' })).toEqual({});
  });

  test('registro con contraseña corta y correo inválido marca ambos campos', () => {
    const errores = validarRegistro({ nombre: 'Ana', correo: 'ana@', password: '123' });
    expect(Object.keys(errores).sort()).toEqual(['correo', 'password']);
  });

  test('inicio de sesión exige correo y contraseña', () => {
    expect(Object.keys(validarInicioSesion({ correo: '', password: '' })).sort()).toEqual(['correo', 'password']);
  });

  test('perfil incompleto señala cada campo faltante', () => {
    const errores = validarPerfil({ pesoKg: '70', alturaCm: '', edad: '', sexo: '', actividadFisica: '' });
    expect(Object.keys(errores).sort()).toEqual(['actividadFisica', 'alturaCm', 'edad', 'sexo']);
    expect(errores.alturaCm).toBe('La altura es obligatoria');
  });

  test('perfil fuera de rango o con edad decimal es inválido', () => {
    const errores = validarPerfil({ pesoKg: '5', alturaCm: '300', edad: '25.5', sexo: 'otro', actividadFisica: 'extrema' });
    expect(Object.keys(errores).sort()).toEqual(['actividadFisica', 'alturaCm', 'edad', 'pesoKg', 'sexo']);
  });

  test('perfil completo y válido no tiene errores', () => {
    expect(validarPerfil({ pesoKg: '70.5', alturaCm: '175', edad: '30', sexo: 'femenino', actividadFisica: 'moderada' })).toEqual({});
  });
});

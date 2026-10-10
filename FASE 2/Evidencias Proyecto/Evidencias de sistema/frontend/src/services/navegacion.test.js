import { expect, test } from 'vitest';
import { ACCESO_NO_DISPONIBLE, destinoTrasIngreso, inicioDe } from './navegacion.js';
import { formatearKm, formatearNumero, iniciales, primerNombre } from './formato.js';

test('después de iniciar sesión vuelve a la ruta interna pedida o va al Inicio', () => {
  expect(destinoTrasIngreso({ desde: '/profesionales?q=nutri&distancia=5' })).toBe('/profesionales?q=nutri&distancia=5');
  expect(destinoTrasIngreso(null)).toBe('/inicio');
  expect(destinoTrasIngreso({})).toBe('/inicio');
  // Nunca redirige fuera de FitSearch.
  expect(destinoTrasIngreso({ desde: '//sitio-externo.example' })).toBe('/inicio');
  expect(destinoTrasIngreso({ desde: 'https://sitio-externo.example' })).toBe('/inicio');
});

test('cada rol tiene su propio Inicio y una cuenta sin rol elegido va primero a "Elegir perfil" (DAS, D25)', () => {
  expect(inicioDe({ rol: 'usuario', rolConfirmado: true })).toBe('/inicio');
  expect(inicioDe({ rol: 'profesional', rolConfirmado: true })).toBe('/profesional/inicio');
  expect(inicioDe({ rol: 'usuario', rolConfirmado: false })).toBe('/elegir-perfil');
  // Las sesiones guardadas antes del cambio no traen rolConfirmado: se consideran confirmadas.
  expect(inicioDe({ rol: 'profesional' })).toBe('/profesional/inicio');
});

test('después de iniciar sesión solo vuelve a una página del espacio de su rol', () => {
  const profesional = { rol: 'profesional', rolConfirmado: true };
  const usuario = { rol: 'usuario', rolConfirmado: true };
  expect(destinoTrasIngreso({ desde: '/profesional/perfil' }, profesional)).toBe('/profesional/perfil');
  expect(destinoTrasIngreso({ desde: '/favoritos' }, profesional)).toBe('/profesional/inicio');
  expect(destinoTrasIngreso({ desde: '/profesional/agenda' }, usuario)).toBe('/inicio');
  // "/profesionales" (el buscador del usuario) no es parte del espacio del profesional.
  expect(destinoTrasIngreso({ desde: '/profesionales?q=nutri' }, usuario)).toBe('/profesionales?q=nutri');
  expect(destinoTrasIngreso({ desde: '/favoritos' }, { rol: 'usuario', rolConfirmado: false })).toBe('/elegir-perfil');
});

test('los números se muestran con el formato de Chile', () => {
  expect(formatearNumero(2556)).toBe('2.556');
  expect(formatearNumero(4.5)).toBe('4,5');
  expect(formatearKm(2.34)).toBe('2,3 km');
  expect(iniciales('Ana María Pérez')).toBe('AM');
  expect(primerNombre('  Ana Pérez')).toBe('Ana');
});

test('una cuenta administrativa entra a su dashboard y solo vuelve a rutas administrativas', () => {
  const administrador = { rol: 'administrador', rolConfirmado: true };
  expect(inicioDe(administrador)).toBe('/admin/dashboard');
  expect(destinoTrasIngreso({ desde: '/favoritos' }, administrador)).toBe('/admin/dashboard');
  expect(destinoTrasIngreso({ desde: '/admin/verificaciones?pagina=2' }, administrador)).toBe('/admin/verificaciones?pagina=2');
  expect(destinoTrasIngreso({ desde: '/admin/usuarios' }, { rol: 'usuario' })).toBe('/inicio');
});

test.each(['usuario', 'profesional'])('el rol %s no vuelve al aviso después de iniciar sesión', (rol) => {
  const usuario = { rol, rolConfirmado: true };
  expect(destinoTrasIngreso({ desde: ACCESO_NO_DISPONIBLE }, usuario)).toBe(inicioDe(usuario));
  expect(destinoTrasIngreso({ desde: `${ACCESO_NO_DISPONIBLE}?origen=perfil` }, usuario)).toBe(inicioDe(usuario));
});

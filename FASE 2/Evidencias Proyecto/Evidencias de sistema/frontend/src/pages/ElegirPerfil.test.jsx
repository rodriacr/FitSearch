// "¿Cómo quieres usar FitSearch?" (DAS, D25): se elige una sola vez, fuera del asistente de perfil.
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test } from 'vitest';
import { CLIMA, renderizarApp, respuestaPerfil, SESION, SESION_NUEVA, simularApi } from '../tests/utilidades.jsx';

const TITULO = { level: 1, name: '¿Cómo quieres usar FitSearch?' };
const PROFESIONAL_CONFIRMADO = { ...SESION.usuario, rol: 'profesional', rolConfirmado: true };

// Servidor simulado: PUT /api/perfil/tipo-cuenta confirma el rol y devuelve un token nuevo, como la API real.
function simular({ tipoCuenta = (_, { body }) => {
  const { rol } = JSON.parse(body);
  const usuario = { ...SESION.usuario, rol, rolConfirmado: true };
  return [200, { ...respuestaPerfil({ usuario }), token: `token-${rol}` }];
} } = {}) {
  return simularApi({
    '/api/perfil/tipo-cuenta': tipoCuenta,
    '/api/perfil': respuestaPerfil(),
    '/api/profesionales/mi-ficha': { ficha: null },
    '/api/clima': CLIMA,
  });
}
const cuerpoDe = (fetch) => JSON.parse(fetch.mock.calls.find(([url]) => url === '/api/perfil/tipo-cuenta')[1].body);
const sesionGuardada = () => JSON.parse(sessionStorage.getItem('fitsearch_sesion'));

beforeEach(() => sessionStorage.setItem('fitsearch_sesion', JSON.stringify(SESION_NUEVA)));

describe('Elegir perfil', () => {
  test('muestra las dos opciones con sus beneficios, fuera del asistente de perfil', () => {
    simular();
    renderizarApp('/elegir-perfil');

    expect(screen.getByRole('heading', TITULO)).toBeInTheDocument();
    expect(screen.getByText('Paso 2 de 3')).toBeInTheDocument();
    const pasos = screen.getByRole('list', { name: 'Pasos para crear tu cuenta' });
    expect(within(pasos).getAllByRole('listitem').map((paso) => paso.textContent)).toEqual(['Tu cuenta', '2Selecciona tu perfil', '3¡Listo!']);
    expect(screen.getByRole('heading', { level: 2, name: 'Usuario' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Profesional' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Continuar como usuario/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Continuar como profesional/ })).toBeInTheDocument();
    // Se elige una sola vez: no se promete cambiarlo desde la cuenta.
    expect(screen.getByText(/el administrador puede hacerlo/)).toBeInTheDocument();
    expect(screen.queryByText(/configuración de tu cuenta/)).not.toBeInTheDocument();
    // No es parte del diseño con menú: todavía no tiene un espacio propio.
    expect(screen.queryByRole('navigation', { name: 'Menú principal' })).not.toBeInTheDocument();
  });

  test('"Continuar como usuario" confirma el rol y sigue con el asistente de datos personales', async () => {
    const fetch = simular();
    renderizarApp('/elegir-perfil');

    await userEvent.click(screen.getByRole('button', { name: /Continuar como usuario/ }));

    expect(await screen.findByRole('heading', { name: 'Datos personales' })).toBeInTheDocument();
    expect(cuerpoDe(fetch)).toEqual({ rol: 'usuario' });
    expect(sesionGuardada()).toEqual({ token: 'token-usuario', usuario: { ...SESION.usuario, rolConfirmado: true } });
  });

  test('"Continuar como profesional" lo deja listo y entra directo a su Inicio, sin datos de usuario', async () => {
    const fetch = simular();
    renderizarApp('/elegir-perfil');

    await userEvent.click(screen.getByRole('button', { name: /Continuar como profesional/ }));

    expect(await screen.findByRole('heading', { level: 1, name: '¡Hola, Ana!' })).toBeInTheDocument();
    expect(screen.getByText(/¡Listo! Tu cuenta profesional está creada/)).toBeInTheDocument();
    expect(cuerpoDe(fetch)).toEqual({ rol: 'profesional' });
    expect(sesionGuardada()).toEqual({ token: 'token-profesional', usuario: PROFESIONAL_CONFIRMADO });
    expect(screen.queryByRole('heading', { name: 'Datos personales' })).not.toBeInTheDocument();
    const menu = screen.getByRole('navigation', { name: 'Menú principal' });
    expect(within(menu).getByRole('link', { name: /Agenda/ })).toBeInTheDocument();
    expect(within(menu).queryByRole('link', { name: /Favoritos/ })).not.toBeInTheDocument();
  });

  test('si otra pestaña confirmó el perfil, descarta el token anterior y pide iniciar sesión otra vez', async () => {
    const fetch = simularApi({
      '/api/perfil/tipo-cuenta': () => [409, { error: 'Ya elegiste cómo usar FitSearch. Si necesitas cambiarlo, el administrador de FitSearch puede hacerlo.' }],
      '/api/auth/login': { token: 'token-profesional-actualizado', usuario: PROFESIONAL_CONFIRMADO },
      '/api/profesionales/mi-ficha': (_, { headers }) => headers.Authorization === 'Bearer token-profesional-actualizado'
        ? [200, { ficha: null }] : [403, { error: 'No tienes permisos para realizar esta acción' }],
      '/api/clima': CLIMA,
    });
    renderizarApp('/elegir-perfil');
    await userEvent.click(screen.getByRole('button', { name: /Continuar como usuario/ }));

    expect(await screen.findByRole('heading', { level: 1, name: '¡Bienvenido!' })).toBeInTheDocument();
    expect(screen.getByText(/Tu perfil ya fue elegido. Inicia sesión nuevamente/)).toBeInTheDocument();
    expect(sesionGuardada()).toBeNull();
    expect(fetch.mock.calls.some(([url]) => url === '/api/profesionales/mi-ficha')).toBe(false);

    await userEvent.type(screen.getByLabelText('Correo electrónico'), SESION.usuario.correo);
    await userEvent.type(screen.getByLabelText('Contraseña'), 'ClaveDePrueba123!');
    await userEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }));
    expect(await screen.findByRole('heading', { level: 1, name: '¡Hola, Ana!' })).toBeInTheDocument();
    expect(sesionGuardada()).toEqual({ token: 'token-profesional-actualizado', usuario: PROFESIONAL_CONFIRMADO });
  });

  test('si falla al guardar, muestra el error y permite intentarlo de nuevo', async () => {
    simular({ tipoCuenta: () => [500, { error: 'Ocurrió un error inesperado. Intenta nuevamente más tarde' }] });
    renderizarApp('/elegir-perfil');

    await userEvent.click(screen.getByRole('button', { name: /Continuar como profesional/ }));

    expect(await screen.findByText('Ocurrió un error inesperado. Intenta nuevamente más tarde')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Continuar como profesional/ })).toBeEnabled();
    expect(sesionGuardada()).toEqual(SESION_NUEVA);
  });

  test('una cuenta que ya eligió no vuelve a ver esta pantalla', () => {
    sessionStorage.setItem('fitsearch_sesion', JSON.stringify(SESION));
    simularApi({ '/api/perfil': respuestaPerfil(), '/api/profesionales': { profesionales: [], pagina: 1, total: 0, totalPaginas: 0, hayMas: false } });
    renderizarApp('/elegir-perfil');

    expect(screen.queryByRole('heading', TITULO)).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Tu salud y bienestar, en un solo lugar' })).toBeInTheDocument();
  });

  test('mientras no elige, las pantallas con menú lo devuelven aquí', () => {
    simular();
    renderizarApp('/favoritos');
    expect(screen.getByRole('heading', TITULO)).toBeInTheDocument();
  });

  test('"Cerrar sesión" sale y vuelve a la portada', async () => {
    simular();
    renderizarApp('/elegir-perfil');

    await userEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }));

    expect(await screen.findByText('Cerraste sesión correctamente.')).toBeInTheDocument();
    expect(sessionStorage.getItem('fitsearch_sesion')).toBeNull();
  });
});

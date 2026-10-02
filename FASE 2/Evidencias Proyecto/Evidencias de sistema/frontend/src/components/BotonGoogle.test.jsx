// Pruebas de "Continuar con Google" (FS-HU-16). Se simula Google Identity Services: el script real no se carga
// en las pruebas, así que se define window.google y se invoca el callback como lo haría Google tras elegir la cuenta.
import { screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { renderizarApp, respuestaJson, respuestaPerfil, SESION } from '../tests/utilidades.jsx';

const CLIENTE_ID = '420482881439-pruebas.apps.googleusercontent.com';

// Deja preparado window.google y devuelve una función que dispara el callback con la credencial.
function simularGoogle() {
  const identidad = { initialize: vi.fn(), renderButton: vi.fn() };
  window.google = { accounts: { id: identidad } };
  return {
    identidad,
    elegirCuenta: async (credential = 'token-de-google') => {
      // El botón se inicializa dentro de una promesa, así que primero hay que esperar a que ocurra.
      await vi.waitFor(() => expect(identidad.initialize).toHaveBeenCalled());
      // Se usa la última inicialización porque StrictMode repite los efectos.
      const { callback } = identidad.initialize.mock.calls.at(-1)[0];
      await callback({ credential });
    },
  };
}

describe('FS-HU-16: continuar con Google', () => {
  test('sin VITE_GOOGLE_CLIENT_ID el botón queda desactivado', () => {
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', '');
    renderizarApp('/iniciar-sesion');

    expect(screen.getByRole('button', { name: 'Continuar con Google' })).toBeDisabled();
  });

  test('con el ID de cliente configurado dibuja el botón oficial de Google', async () => {
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', CLIENTE_ID);
    const { identidad } = simularGoogle();
    renderizarApp('/iniciar-sesion');

    await vi.waitFor(() => expect(identidad.renderButton).toHaveBeenCalled());
    expect(identidad.initialize.mock.calls.at(-1)[0].client_id).toBe(CLIENTE_ID);
    expect(identidad.renderButton.mock.calls.at(-1)[1].text).toBe('continue_with');
    expect(screen.queryByRole('button', { name: 'Continuar con Google' })).not.toBeInTheDocument();
  });

  test('escenario 1: una cuenta nueva de Google entra al asistente de perfil', async () => {
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', CLIENTE_ID);
    const fetch = vi.spyOn(globalThis, 'fetch').mockImplementation((url) => (url === '/api/auth/google'
      ? respuestaJson(200, { ...SESION, cuentaNueva: true })
      : respuestaJson(200, respuestaPerfil({ tipoCuenta: false }))));
    const { elegirCuenta } = simularGoogle();
    renderizarApp('/iniciar-sesion');
    await elegirCuenta();

    expect(await screen.findByText(/Tu cuenta fue creada con Google/)).toBeInTheDocument();
    // El tipo de cuenta no lo decide Google: lo elige la persona en el asistente (cambio de flujo del 24-09-2026).
    expect(screen.getByRole('heading', { name: 'Tipo de cuenta' })).toBeInTheDocument();
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({ credencial: 'token-de-google', recordar: false });
    // Sin "Recordarme" la sesión no debe sobrevivir al cierre del navegador.
    expect(localStorage.getItem('fitsearch_sesion')).toBeNull();
    expect(JSON.parse(sessionStorage.getItem('fitsearch_sesion'))).toEqual(SESION);
  });

  test('escenario 2: si el backend rechaza la credencial, muestra el mensaje y no inicia sesión', async () => {
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', CLIENTE_ID);
    const mensaje = 'No fue posible validar tu cuenta de Google. Intenta nuevamente';
    vi.spyOn(globalThis, 'fetch').mockImplementation(() => respuestaJson(401, { error: mensaje }));
    const { elegirCuenta } = simularGoogle();
    renderizarApp('/iniciar-sesion');
    await elegirCuenta();

    expect(await screen.findByText(mensaje)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '¡Bienvenido!' })).toBeInTheDocument();
    expect(sessionStorage.getItem('fitsearch_sesion')).toBeNull();
  });
});

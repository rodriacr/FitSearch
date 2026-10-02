import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import { PERFIL_COMPLETO, renderizarApp, respuestaJson, respuestaPerfil, SESION } from '../tests/utilidades.jsx';

describe('Portada pública de FitSearch (solo para invitados)', () => {
  test('sin sesión es lo primero que se ve y no llama a la API', () => {
    const fetch = vi.spyOn(globalThis, 'fetch');
    renderizarApp();

    expect(screen.getByRole('heading', { level: 1, name: /Tu bienestar,\s*un paso más cerca/ })).toBeInTheDocument();
    expect(screen.getAllByText('Próximamente')).toHaveLength(3);
    expect(screen.getByRole('link', { name: 'Crear cuenta' })).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  test('el llamado principal lleva al registro existente', async () => {
    renderizarApp();
    await userEvent.click(screen.getByRole('link', { name: 'Comenzar mi camino' }));
    expect(screen.getByRole('textbox', { name: 'Nombre completo' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Registrarse' })).toBeInTheDocument();
  });

  test('el acceso del encabezado abre el inicio de sesión', async () => {
    renderizarApp();
    await userEvent.click(screen.getAllByRole('link', { name: 'Iniciar sesión' })[0]);
    expect(screen.getByRole('heading', { name: '¡Bienvenido!' })).toBeInTheDocument();
  });

  test('con sesión no se muestra: la raíz lleva directo al perfil', async () => {
    sessionStorage.setItem('fitsearch_sesion', JSON.stringify(SESION));
    vi.spyOn(globalThis, 'fetch').mockImplementation(() => respuestaJson(200, respuestaPerfil(PERFIL_COMPLETO)));
    renderizarApp('/');

    expect(await screen.findByRole('heading', { name: 'Hola, Ana Pérez' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 1, name: /Tu bienestar,\s*un paso más cerca/ })).not.toBeInTheDocument();
  });

  test('con sesión, una ruta desconocida también lleva al perfil y no a la portada', async () => {
    localStorage.setItem('fitsearch_sesion', JSON.stringify(SESION));
    vi.spyOn(globalThis, 'fetch').mockImplementation(() => respuestaJson(200, respuestaPerfil(PERFIL_COMPLETO)));
    renderizarApp('/ruta-que-no-existe');

    expect(await screen.findByRole('heading', { name: 'Hola, Ana Pérez' })).toBeInTheDocument();
  });

  test('al cerrar sesión desde el perfil vuelve a la portada con el aviso, que desaparece al salir', async () => {
    localStorage.setItem('fitsearch_sesion', JSON.stringify(SESION));
    const fetch = vi.spyOn(globalThis, 'fetch').mockImplementation((url) => (url === '/api/auth/logout'
      ? Promise.resolve(new Response(null, { status: 204 }))
      : respuestaJson(200, respuestaPerfil(PERFIL_COMPLETO))));
    renderizarApp('/perfil');

    await userEvent.click(await screen.findByRole('button', { name: 'Cerrar sesión' }));

    expect(await screen.findByRole('heading', { level: 1, name: /Tu bienestar,\s*un paso más cerca/ })).toBeInTheDocument();
    expect(screen.getByText('Cerraste sesión correctamente.')).toBeInTheDocument();
    expect(localStorage.getItem('fitsearch_sesion')).toBeNull();
    expect(sessionStorage.getItem('fitsearch_sesion')).toBeNull();
    expect(fetch).toHaveBeenCalledWith('/api/auth/logout', expect.objectContaining({ method: 'POST' }));

    await userEvent.click(screen.getAllByRole('link', { name: 'Iniciar sesión' })[0]);
    expect(screen.getByRole('heading', { name: '¡Bienvenido!' })).toBeInTheDocument();
    expect(screen.queryByText('Cerraste sesión correctamente.')).not.toBeInTheDocument();
  });
});

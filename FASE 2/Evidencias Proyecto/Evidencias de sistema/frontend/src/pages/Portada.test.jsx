import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import { listado, PERFIL_COMPLETO, renderizarApp, respuestaPerfil, SESION, simularApi } from '../tests/utilidades.jsx';

const TITULO = { level: 1, name: 'Tu salud y bienestar, en un solo lugar' };
const API_CON_SESION = {
  '/api/auth/logout': () => [204],
  '/api/perfil': respuestaPerfil(PERFIL_COMPLETO),
  '/api/profesionales': listado([]),
};

describe('Portada pública de FitSearch (FS-HU-20, solo para invitados)', () => {
  test('sin sesión es lo primero que se ve, presenta lo que ofrece FitSearch y no llama a la API', () => {
    const fetch = vi.spyOn(globalThis, 'fetch');
    renderizarApp();

    expect(screen.getByRole('heading', TITULO)).toBeInTheDocument();
    for (const oferta of ['Profesionales', 'Centros de salud', 'Gimnasios', 'Comidas', 'Asistente IA']) {
      expect(screen.getByRole('heading', { level: 3, name: oferta })).toBeInTheDocument();
    }
    // Solo el directorio de profesionales está disponible; el resto se anuncia sin simular resultados.
    expect(screen.getAllByText('Próximamente')).toHaveLength(4);
    expect(screen.queryByText('Farmacias')).not.toBeInTheDocument();
    expect(screen.getByText('Disponible')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /Registrarse/ }).length).toBeGreaterThan(0);
    expect(screen.queryByRole('navigation', { name: 'Menú principal' })).not.toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  test('"Registrarse" lleva al registro', async () => {
    renderizarApp();
    await userEvent.click(screen.getAllByRole('link', { name: /Registrarse/ })[0]);
    expect(screen.getByRole('textbox', { name: 'Nombre completo' })).toBeInTheDocument();
  });

  test('"Iniciar sesión" abre el inicio de sesión', async () => {
    renderizarApp();
    await userEvent.click(screen.getAllByRole('link', { name: 'Iniciar sesión' })[0]);
    expect(screen.getByRole('heading', { name: '¡Bienvenido!' })).toBeInTheDocument();
  });

  test('el paso a paso ya no dice que el rol se elige al registrarse (DAS, D21)', () => {
    renderizarApp();
    expect(screen.queryByText(/elige tu rol/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Elige tu tipo de cuenta/)).toBeInTheDocument();
  });

  test('con sesión no se muestra: la raíz lleva al Inicio', async () => {
    sessionStorage.setItem('fitsearch_sesion', JSON.stringify(SESION));
    simularApi(API_CON_SESION);
    renderizarApp('/');

    expect(await screen.findByRole('navigation', { name: 'Menú principal' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Tus accesos rápidos' })).toBeInTheDocument();
  });

  test('con sesión, una ruta desconocida también lleva al Inicio y no a la portada', async () => {
    localStorage.setItem('fitsearch_sesion', JSON.stringify(SESION));
    simularApi(API_CON_SESION);
    renderizarApp('/ruta-que-no-existe');

    expect(await screen.findByRole('heading', { name: 'Tus accesos rápidos' })).toBeInTheDocument();
  });

  test('al cerrar sesión desde el menú de la cuenta vuelve a la portada con el aviso, que desaparece al salir', async () => {
    localStorage.setItem('fitsearch_sesion', JSON.stringify(SESION));
    const fetch = simularApi(API_CON_SESION);
    renderizarApp('/perfil');

    await userEvent.click(await screen.findByRole('button', { name: 'Hola, Ana: menú de tu cuenta' }));
    await userEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }));

    expect(await screen.findByRole('heading', TITULO)).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Menú principal' })).not.toBeInTheDocument();
    expect(screen.getByText('Cerraste sesión correctamente.')).toBeInTheDocument();
    expect(localStorage.getItem('fitsearch_sesion')).toBeNull();
    expect(sessionStorage.getItem('fitsearch_sesion')).toBeNull();
    expect(fetch).toHaveBeenCalledWith('/api/auth/logout', expect.objectContaining({ method: 'POST' }));

    await userEvent.click(screen.getAllByRole('link', { name: 'Iniciar sesión' })[0]);
    expect(screen.getByRole('heading', { name: '¡Bienvenido!' })).toBeInTheDocument();
    expect(screen.queryByText('Cerraste sesión correctamente.')).not.toBeInTheDocument();
  });
});

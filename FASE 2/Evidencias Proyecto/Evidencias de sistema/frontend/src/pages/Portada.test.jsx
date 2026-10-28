import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import { listado, llamadasA, parametrosDe, PERFIL_COMPLETO, renderizarApp, respuestaPerfil, SESION, simularApi } from '../tests/utilidades.jsx';

const TITULO = { level: 1, name: /Tu bienestar,\s*a tu ritmo\./ };
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
    // El directorio, el asistente y Comidas están disponibles; centros de salud y gimnasios mantienen su aviso.
    expect(screen.getAllByText('Próximamente')).toHaveLength(2);
    expect(screen.queryByText('Farmacias')).not.toBeInTheDocument();
    expect(screen.getAllByText('Disponible')).toHaveLength(3);
    expect(screen.getAllByRole('link', { name: /Registrarse/ }).length).toBeGreaterThan(0);
    expect(screen.queryByRole('navigation', { name: 'Menú principal' })).not.toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });


  test('la búsqueda pública conserva especialidad y comuna después de iniciar sesión', async () => {
    const fetch = simularApi({
      ...API_CON_SESION,
      '/api/auth/login': SESION,
      '/api/profesionales/filtros': { especialidades: ['Nutrición'], comunas: ['Ñuñoa'] },
    });
    renderizarApp('/');
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Especialidad' }), 'Nutrición');
    await userEvent.type(screen.getByRole('textbox', { name: 'Comuna' }), '  Ñuñoa  ');
    await userEvent.click(screen.getByRole('button', { name: 'Buscar profesionales' }));
    expect(screen.getByRole('heading', { name: '¡Bienvenido!' })).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Correo electrónico'), 'ana@correo.cl');
    await userEvent.type(screen.getByLabelText('Contraseña'), 'ClaveSegura123');
    await userEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Profesionales' })).toBeInTheDocument();
    expect(parametrosDe(llamadasA(fetch, '/api/profesionales?')[0][0])).toMatchObject({ especialidad: 'Nutrición', comuna: 'Ñuñoa' });
  });

  test('cada herramienta disponible lleva a su sección; Comidas vuelve a Comidas después de iniciar sesión', async () => {
    const fetch = simularApi({
      ...API_CON_SESION,
      '/api/auth/login': SESION,
      '/api/comidas/semana': { desde: '2026-10-26', hasta: '2026-11-01', objetivoCalorias: null, dias: [] },
      '/api/comidas': {
        fecha: '2026-10-27', hoy: '2026-10-27', momentos: [],
        objetivo: { calorias: null, proteinasG: null, carbohidratosG: null, grasasG: null, perfil: {} },
        consumo: { calorias: 0, proteinasG: 0, carbohidratosG: 0, grasasG: 0 },
      },
    });
    renderizarApp('/');
    const destinoDe = (nombre) => screen.getByRole('heading', { level: 3, name: nombre }).closest('article').querySelector('a')?.getAttribute('href');
    expect(destinoDe('Profesionales')).toBe('/profesionales');
    expect(destinoDe('Comidas')).toBe('/comidas');
    expect(destinoDe('Asistente IA')).toBe('/asistente');
    expect(destinoDe('Gimnasios')).toBeUndefined();

    await userEvent.click(screen.getByRole('heading', { level: 3, name: 'Comidas' }).closest('article').querySelector('a'));
    expect(screen.getByRole('heading', { name: '¡Bienvenido!' })).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Correo electrónico'), 'ana@correo.cl');
    await userEvent.type(screen.getByLabelText('Contraseña'), 'ClaveSegura123');
    await userEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Comidas' })).toBeInTheDocument();
    expect(llamadasA(fetch, '/api/profesionales?')).toHaveLength(0);
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

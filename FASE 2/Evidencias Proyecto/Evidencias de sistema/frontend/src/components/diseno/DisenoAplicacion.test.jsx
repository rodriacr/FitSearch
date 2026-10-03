// Navegación con sesión: logo, enlace "Profesionales", menú de la cuenta, menú lateral, barra inferior y secciones próximas.
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test } from 'vitest';
import { listado, PERFIL_COMPLETO, renderizarApp, respuestaPerfil, SESION, simularApi } from '../../tests/utilidades.jsx';

const API = {
  '/api/perfil': respuestaPerfil(PERFIL_COMPLETO),
  '/api/profesionales/filtros': { especialidades: [], comunas: [] },
  '/api/profesionales': listado([]),
};

describe('Con sesión', () => {
  beforeEach(() => {
    sessionStorage.setItem('fitsearch_sesion', JSON.stringify(SESION));
    simularApi(API);
  });

  test('el logo lleva al Inicio y nunca al perfil', async () => {
    renderizarApp('/perfil');
    const logo = await screen.findByRole('link', { name: 'FitSearch, ir al inicio' });
    expect(logo).toHaveAttribute('href', '/inicio');
    await userEvent.click(logo);
    expect(await screen.findByRole('heading', { name: 'Tus accesos rápidos' })).toBeInTheDocument();
  });

  test('"Hola, {nombre}" abre el menú de la cuenta con "Mi perfil" y "Cerrar sesión"; Escape lo cierra', async () => {
    renderizarApp('/inicio');
    const boton = screen.getByRole('button', { name: 'Hola, Ana: menú de tu cuenta' });
    expect(boton).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('button', { name: 'Cerrar sesión' })).not.toBeInTheDocument();

    await userEvent.click(boton);
    expect(boton).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('ana@correo.cl')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cerrar sesión' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Configuración/ })).not.toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    expect(boton).toHaveAttribute('aria-expanded', 'false');

    await userEvent.click(boton);
    await userEvent.click(within(document.getElementById('menu-cuenta')).getByRole('link', { name: 'Mi perfil' }));
    expect(await screen.findByRole('heading', { name: 'Hola, Ana Pérez' })).toBeInTheDocument();
    expect(screen.queryByText('ana@correo.cl')).not.toBeInTheDocument();
  });

  test('"Mi perfil" del menú lateral y "Perfil" de la barra inferior llevan al perfil', async () => {
    renderizarApp('/inicio');
    const menu = screen.getByRole('navigation', { name: 'Menú principal' });
    await userEvent.click(within(menu).getByRole('link', { name: 'Mi perfil' }));
    expect(await screen.findByRole('heading', { name: 'Hola, Ana Pérez' })).toBeInTheDocument();
    expect(within(menu).getByRole('link', { name: 'Mi perfil' })).toHaveAttribute('aria-current', 'page');

    await userEvent.click(within(menu).getByRole('link', { name: 'Inicio' }));
    const barra = screen.getByRole('navigation', { name: 'Navegación inferior' });
    expect(within(barra).getAllByRole('link').map((enlace) => enlace.textContent)).toEqual(['Inicio', 'Profesionales', 'Chat IA', 'Perfil']);
    await userEvent.click(within(barra).getByRole('link', { name: 'Perfil' }));
    expect(await screen.findByRole('heading', { name: 'Hola, Ana Pérez' })).toBeInTheDocument();
  });

  test('el menú lateral tiene las secciones del mockup con "Profesionales" en vez de "Buscar profesionales"', () => {
    renderizarApp('/inicio');
    const menu = screen.getByRole('navigation', { name: 'Menú principal' });
    const nombres = within(menu).getAllByRole('link').map((enlace) => enlace.textContent.replace('Próximamente', '').trim());
    expect(nombres).toEqual(['Inicio', 'Profesionales', 'Centros de salud', 'Gimnasios', 'Farmacias', 'Asistente IA', 'Mi perfil', 'Historial de chats', 'Favoritos', 'Abrir chat']);
    expect(within(menu).queryByText('Buscar profesionales')).not.toBeInTheDocument();
    expect(within(menu).getByText('¿Necesitas una recomendación?')).toBeInTheDocument();
  });

  test('una sección que aún no existe muestra "Próximamente" sin datos simulados', async () => {
    renderizarApp('/inicio');
    await userEvent.click(within(screen.getByRole('navigation', { name: 'Menú principal' })).getByRole('link', { name: /Gimnasios/ }));
    expect(screen.getByRole('heading', { level: 1, name: 'Gimnasios' })).toBeInTheDocument();
    expect(screen.getByText(/Pronto podrás descubrir gimnasios/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Buscar profesionales/ })).toHaveAttribute('href', '/profesionales');
  });

  test('la campana abre un aviso vacío de notificaciones', async () => {
    renderizarApp('/inicio');
    await userEvent.click(screen.getByRole('button', { name: 'Notificaciones' }));
    expect(screen.getByText('No tienes notificaciones')).toBeInTheDocument();
  });

  test('el botón de menú del celular abre el menú y se cierra al navegar', async () => {
    renderizarApp('/inicio');
    const boton = screen.getByRole('button', { name: 'Abrir menú' });
    await userEvent.click(boton);
    expect(screen.getByRole('button', { name: 'Cerrar menú', expanded: true })).toBeInTheDocument();
    await userEvent.click(within(screen.getByRole('navigation', { name: 'Menú principal' })).getByRole('link', { name: 'Favoritos' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Favoritos' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Abrir menú' })).toHaveAttribute('aria-expanded', 'false');
  });
});

test('sin sesión, el logo de las pantallas de acceso lleva a la portada', () => {
  renderizarApp('/iniciar-sesion');
  expect(screen.getByRole('link', { name: 'FitSearch, volver al inicio' })).toHaveAttribute('href', '/');
});

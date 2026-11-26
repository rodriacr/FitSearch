// Navegación con sesión: logo, enlace "Profesionales", menú de la cuenta, menú lateral, barra inferior y secciones próximas.
import { act, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { llamadasA, listado, PERFIL_COMPLETO, renderizarApp, respuestaPerfil, SESION, simularApi } from '../../tests/utilidades.jsx';

const API = {
  '/api/chats/no-leidos': { total: 0 },
  '/api/perfil': respuestaPerfil(PERFIL_COMPLETO),
  '/api/profesionales/filtros': { especialidades: [], comunas: [] },
  '/api/profesionales': listado([]),
  '/api/establecimientos/filtros': { comunas: [] },
  '/api/establecimientos': { establecimientos: [], pagina: 1, total: 0, totalPaginas: 0, hayMas: false },
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

  test('la cuenta tiene un bloque separado para salir y el encabezado solo conserva la marca', async () => {
    renderizarApp('/inicio');
    expect(screen.queryByRole('button', { name: /menú de tu cuenta/ })).not.toBeInTheDocument();
    const principal = screen.getByRole('navigation', { name: 'Menú principal' });
    await userEvent.click(screen.getByRole('button', { name: 'Más opciones' }));
    const cuenta = screen.getByRole('navigation', { name: 'Cuenta' });
    expect(within(cuenta).getByRole('button', { name: 'Cerrar sesión' })).toBeInTheDocument();
    expect(within(principal).queryByRole('button', { name: 'Cerrar sesión' })).not.toBeInTheDocument();
    expect(document.querySelector('.encabezado').querySelector('.notificaciones__boton')).toBeNull();
    await userEvent.click(within(principal).getByRole('link', { name: 'Mi perfil' }));
    expect(await screen.findByRole('heading', { name: 'Mi perfil' })).toBeInTheDocument();
  });

  test('"Mi perfil" del menú lateral y "Perfil" de la barra inferior llevan al perfil', async () => {
    renderizarApp('/inicio');
    const menu = screen.getByRole('navigation', { name: 'Menú principal' });
    await userEvent.click(within(menu).getByRole('link', { name: 'Mi perfil' }));
    expect(await screen.findByRole('heading', { name: 'Mi perfil' })).toBeInTheDocument();
    expect(within(menu).getByRole('link', { name: 'Mi perfil' })).toHaveAttribute('aria-current', 'page');
    // La sección actual se reconoce por el ícono relleno (18-11-2026); las demás quedan con el ícono de línea.
    expect(within(menu).getByRole('link', { name: 'Mi perfil' }).querySelector('.avatar-navegacion')).not.toBeNull();
    expect(within(menu).getByRole('link', { name: 'Inicio' }).querySelector('.icono--activo')).toBeNull();

    await userEvent.click(within(menu).getByRole('link', { name: 'Inicio' }));
    const barra = screen.getByRole('navigation', { name: 'Navegación inferior' });
    expect(within(barra).getAllByRole('link').map((enlace) => enlace.querySelector('.barra-inferior__texto').textContent)).toEqual(['Inicio', 'Profesionales', 'Chat IA', 'Comidas', 'Perfil']);
    await userEvent.click(within(barra).getByRole('link', { name: 'Perfil' }));
    expect(await screen.findByRole('heading', { name: 'Mi perfil' })).toBeInTheDocument();
    // Barra inferior solo con íconos (18-11-2026): el nombre queda para lectores de pantalla y la sección actual va rellena.
    expect(within(barra).getByRole('link', { name: 'Perfil' }).querySelector('.avatar-navegacion')).not.toBeNull();
    expect(within(barra).getByRole('link', { name: 'Chat IA' }).querySelector('.icono--activo')).toBeNull();
    expect(within(barra).getByText('Perfil')).toHaveClass('barra-inferior__texto');
  });

  test('el menú conserva todas las secciones del usuario con sus títulos', () => {
    renderizarApp('/inicio');
    const menu = screen.getByRole('navigation', { name: 'Menú principal' });
    expect(within(menu).getAllByRole('link').filter((enlace) => enlace.classList.contains('menu-lateral__enlace')).map((enlace) => enlace.querySelector('.menu-lateral__texto').textContent)).toEqual([
      'Inicio', 'Profesionales', 'Centros de salud', 'Gimnasios', 'Asistente IA', 'Comidas', 'Mis logros', 'Mis citas', 'Mensajes', 'Mi perfil',
    ]);
    expect(within(menu).getByRole('button', { name: 'Notificaciones' })).toBeInTheDocument();
  });

  test('sin avisos pendientes no aparece un contador de notificaciones', async () => {
    simularApi({ ...API, '/api/chats/no-leidos': { total: 0 } });
    renderizarApp('/inicio');
    const boton = await screen.findByRole('button', { name: 'Notificaciones', exact: true });
    expect(boton.querySelector('.notificaciones__contador')).toBeNull();
    await userEvent.click(boton);
    expect(screen.getByText('No tienes notificaciones')).toBeInTheDocument();
  });

  test('en móvil la campana está en el encabezado y en escritorio vuelve al menú principal', async () => {
    const ancho = window.innerWidth;
    window.innerWidth = 390;
    try {
      simularApi({ ...API, '/api/chats/no-leidos': { total: 2 } });
      renderizarApp('/inicio');
      const encabezado = within(screen.getByRole('banner'));
      const menu = within(screen.getByRole('navigation', { name: 'Menú principal' }));
      const etiqueta = 'Notificaciones: 2 mensajes sin leer';
      const campana = await encabezado.findByRole('button', { name: etiqueta });
      expect(menu.queryByRole('button', { name: /Notificaciones/ })).not.toBeInTheDocument();
      await userEvent.click(campana);
      expect(screen.getByRole('link', { name: /2 mensajes nuevos/ })).toHaveAttribute('href', '/mensajes');
      await userEvent.click(encabezado.getByRole('button', { name: 'Abrir menú' }));
      expect(menu.queryByRole('button', { name: /Notificaciones/ })).not.toBeInTheDocument();

      await act(async () => { window.innerWidth = 1024; window.dispatchEvent(new Event('resize')); });
      expect(encabezado.queryByRole('button', { name: /Notificaciones/ })).not.toBeInTheDocument();
      expect(menu.getByRole('button', { name: etiqueta })).toBeInTheDocument();
      expect(encabezado.getByRole('button', { name: 'Abrir menú' })).toHaveAttribute('aria-expanded', 'false');
    } finally {
      window.innerWidth = ancho;
    }
  });

  test('los mensajes sin leer muestran su contador y el enlace a mensajes', async () => {
    simularApi({ ...API, '/api/chats/no-leidos': { total: 2 } });
    renderizarApp('/inicio');
    const boton = await screen.findByRole('button', { name: 'Notificaciones: 2 mensajes sin leer' });
    await userEvent.click(boton);
    expect(screen.getByRole('link', { name: /2 mensajes nuevos/ })).toHaveAttribute('href', '/mensajes');
  });

  test('Escape cierra el menú del celular y devuelve el foco al botón que lo abrió', async () => {
    renderizarApp('/inicio');
    const abrir = screen.getByRole('button', { name: 'Abrir menú' });
    await userEvent.click(abrir);
    expect(within(screen.getByRole('navigation', { name: 'Menú principal' })).getByRole('button', { name: 'Cerrar menú', exact: true })).toHaveFocus();
    await userEvent.keyboard('{Escape}');
    expect(abrir).toHaveAttribute('aria-expanded', 'false');
    expect(abrir).toHaveFocus();
  });

  test('el menú móvil mantiene el foco y primero cierra las notificaciones con Escape', async () => {
    renderizarApp('/inicio');
    const abrir = screen.getByRole('button', { name: 'Abrir menú' });
    await userEvent.click(abrir);
    const salir = within(screen.getByRole('navigation', { name: 'Cuenta' })).getByRole('button', { name: 'Más opciones' });
    salir.focus();
    await userEvent.tab();
    expect(screen.getByRole('link', { name: 'FitSearch, ir al inicio desde el menú' })).toHaveFocus();
    await userEvent.click(screen.getByRole('button', { name: 'Notificaciones' }));
    await userEvent.keyboard('{Escape}');
    expect(abrir).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('button', { name: 'Notificaciones' })).toHaveFocus();
    await userEvent.keyboard('{Escape}');
    expect(abrir).toHaveAttribute('aria-expanded', 'false');
    expect(abrir).toHaveFocus();
  });

  test('el aspecto se cambia desde Más y queda guardado para la próxima visita', async () => {
    renderizarApp('/inicio');
    await userEvent.click(screen.getByRole('button', { name: 'Más opciones' }));
    await userEvent.click(screen.getByRole('button', { name: 'Cambiar aspecto' }));
    await userEvent.click(screen.getByRole('radio', { name: 'Oscuro' }));
    expect(document.querySelector('.app')).toHaveClass('app--oscuro');
    expect(document.documentElement).toHaveAttribute('data-tema', 'oscuro');
    expect(localStorage.getItem('fitsearch_aspecto')).toBe('oscuro');
    await userEvent.click(screen.getByRole('radio', { name: 'Claro' }));
    expect(document.querySelector('.app')).not.toHaveClass('app--oscuro');
    expect(document.documentElement).toHaveAttribute('data-tema', 'claro');
    expect(localStorage.getItem('fitsearch_aspecto')).toBe('claro');
  });

  test('Configuración abre desde Más, guarda avisos y sigue el cambio de tema del dispositivo', async () => {
    const medio = Object.assign(new EventTarget(), { matches: false });
    vi.stubGlobal('matchMedia', () => medio);
    try {
      const configuracion = { recordatoriosCitas: true, avisosMensajesCorreo: false };
      const fetch = simularApi({ ...API,
        '/api/perfil/cuenta': { cuenta: { nombre: 'Ana', correo: 'ana@example.test', tienePassword: true } },
        '/api/compartir': { profesionales: [], registro: [] },
        '/api/perfil/configuracion': (_url, opciones) => [200, { configuracion: opciones.method === 'PUT'
          ? { ...configuracion, ...JSON.parse(opciones.body) } : configuracion }],
      });
      renderizarApp('/inicio');
      await userEvent.click(screen.getByRole('button', { name: 'Más opciones' }));
      await userEvent.click(screen.getByRole('link', { name: 'Configuración' }));
      expect(await screen.findByRole('heading', { level: 1, name: 'Configuración' })).toBeInTheDocument();
      expect(await screen.findByRole('button', { name: 'Cambiar correo' })).toBeEnabled();
      expect(await screen.findByRole('heading', { name: 'Profesionales con acceso a tu progreso' })).toBeInTheDocument();
      const mensajes = await screen.findByRole('switch', { name: 'Mensajes nuevos por correo' });
      expect(mensajes).not.toBeChecked();
      await userEvent.click(mensajes);
      expect(await screen.findByText('Preferencia guardada.')).toBeInTheDocument();
      expect(mensajes).toBeChecked();
      const [, guardado] = llamadasA(fetch, '/api/perfil/configuracion').find(([, opciones]) => opciones.method === 'PUT');
      expect(JSON.parse(guardado.body)).toEqual({ avisosMensajesCorreo: true });

      const apariencia = within(screen.getByRole('region', { name: 'Apariencia' }));
      await userEvent.click(apariencia.getByRole('radio', { name: 'Sistema' }));
      expect(localStorage.getItem('fitsearch_aspecto')).toBe('sistema');
      act(() => { medio.dispatchEvent(Object.assign(new Event('change'), { matches: true })); });
      expect(document.documentElement).toHaveAttribute('data-tema', 'oscuro');
    } finally {
      vi.unstubAllGlobals();
    }
  });

  test('si falla el guardado de un aviso conserva la preferencia confirmada', async () => {
    simularApi({ ...API,
      '/api/perfil/cuenta': { cuenta: { nombre: 'Ana', correo: 'ana@example.test' } },
      '/api/compartir': { profesionales: [], registro: [] },
      '/api/perfil/configuracion': (_url, opciones) => opciones.method === 'PUT'
        ? [503, { error: 'No pudimos guardar tu preferencia.' }]
        : [200, { configuracion: { recordatoriosCitas: true, avisosMensajesCorreo: false } }],
    });
    renderizarApp('/configuracion');
    const recordatorios = await screen.findByRole('switch', { name: 'Recordatorios de citas' });
    await userEvent.click(recordatorios);
    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos guardar tu preferencia.');
    expect(recordatorios).toBeChecked();
    expect(recordatorios).toBeEnabled();
  });

  // FS-HU-25: Centros de salud y Gimnasios ya no son «Próximamente» (las secciones próximas del profesional se prueban
  // en EspacioProfesional.test.jsx).
  test('"Gimnasios" del menú abre el directorio de gimnasios, sin datos simulados', async () => {
    renderizarApp('/inicio');
    const enlace = within(screen.getByRole('navigation', { name: 'Menú principal' })).getByRole('link', { name: 'Gimnasios' });
    expect(within(enlace).queryByText('Próximamente')).not.toBeInTheDocument();
    await userEvent.click(enlace);
    expect(screen.getByRole('heading', { level: 1, name: 'Gimnasios' })).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Aún no hay gimnasios para mostrar' })).toBeInTheDocument();
    expect(screen.queryByText(/Pronto podrás/)).not.toBeInTheDocument();
  });

  test('la campana abre un aviso vacío de notificaciones', async () => {
    renderizarApp('/inicio');
    await userEvent.click(screen.getByRole('button', { name: 'Notificaciones' }));
    expect(screen.getByText('No tienes notificaciones')).toBeInTheDocument();
  });

  test('Favoritos abre desde Más y al navegar se cierran ambos menús del celular', async () => {
    renderizarApp('/inicio');
    const boton = screen.getByRole('button', { name: 'Abrir menú' });
    await userEvent.click(boton);
    expect(screen.getByRole('button', { name: 'Cerrar menú', expanded: true })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Favoritos' })).not.toBeInTheDocument();
    const mas = screen.getByRole('button', { name: 'Más opciones' });
    await userEvent.click(mas);
    const cuenta = screen.getByRole('navigation', { name: 'Cuenta' });
    await userEvent.click(within(cuenta).getByRole('link', { name: 'Favoritos' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Favoritos' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Abrir menú' })).toHaveAttribute('aria-expanded', 'false');
    expect(mas).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(screen.getByRole('button', { name: 'Abrir menú' }));
    await userEvent.click(mas);
    expect(within(cuenta).getByRole('link', { name: 'Favoritos' })).toHaveAttribute('aria-current', 'page');
  });

  test('con el menú del celular abierto la página de fondo no se desplaza, y vuelve a hacerlo al cerrarlo', async () => {
    renderizarApp('/inicio');
    expect(document.body.style.overflow).toBe('');
    await userEvent.click(screen.getByRole('button', { name: 'Abrir menú' }));
    expect(document.body.style.overflow).toBe('hidden');
    // El fondo oscuro queda montado (para fundirse) y al tocarlo cierra el menú.
    await userEvent.click(document.querySelector('.menu-lateral__fondo--visible'));
    expect(screen.getByRole('button', { name: 'Abrir menú' })).toHaveAttribute('aria-expanded', 'false');
    expect(document.querySelector('.menu-lateral__fondo')).not.toHaveClass('menu-lateral__fondo--visible');
    expect(document.body.style.overflow).toBe('');
  });
});

test('sin sesión, el logo de las pantallas de acceso lleva a la portada', () => {
  renderizarApp('/iniciar-sesion');
  expect(screen.getByRole('link', { name: 'FitSearch, volver al inicio' })).toHaveAttribute('href', '/');
});

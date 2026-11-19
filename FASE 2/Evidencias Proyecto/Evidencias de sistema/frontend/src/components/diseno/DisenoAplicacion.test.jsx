// Navegación con sesión: logo, enlace "Profesionales", menú de la cuenta, menú lateral, barra inferior y secciones próximas.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { listado, PERFIL_COMPLETO, renderizarApp, respuestaPerfil, SESION, simularApi } from '../../tests/utilidades.jsx';

const API = {
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
    expect(await screen.findByRole('heading', { name: 'Mi perfil' })).toBeInTheDocument();
    expect(screen.queryByText('ana@correo.cl')).not.toBeInTheDocument();
  });

  test('"Mi perfil" del menú lateral y "Perfil" de la barra inferior llevan al perfil', async () => {
    renderizarApp('/inicio');
    const menu = screen.getByRole('navigation', { name: 'Menú principal' });
    await userEvent.click(within(menu).getByRole('link', { name: 'Mi perfil' }));
    expect(await screen.findByRole('heading', { name: 'Mi perfil' })).toBeInTheDocument();
    expect(within(menu).getByRole('link', { name: 'Mi perfil' })).toHaveAttribute('aria-current', 'page');
    // La sección actual se reconoce por el ícono relleno (18-11-2026); las demás quedan con el ícono de línea.
    expect(within(menu).getByRole('link', { name: 'Mi perfil' }).querySelector('.icono--activo')).not.toBeNull();
    expect(within(menu).getByRole('link', { name: 'Inicio' }).querySelector('.icono--activo')).toBeNull();

    await userEvent.click(within(menu).getByRole('link', { name: 'Inicio' }));
    const barra = screen.getByRole('navigation', { name: 'Navegación inferior' });
    expect(within(barra).getAllByRole('link').map((enlace) => enlace.textContent)).toEqual(['Inicio', 'Profesionales', 'Chat IA', 'Comidas', 'Perfil']);
    await userEvent.click(within(barra).getByRole('link', { name: 'Perfil' }));
    expect(await screen.findByRole('heading', { name: 'Mi perfil' })).toBeInTheDocument();
    // Barra inferior solo con íconos (18-11-2026): el nombre queda para lectores de pantalla y la sección actual va rellena.
    expect(within(barra).getByRole('link', { name: 'Perfil' }).querySelector('.icono--activo')).not.toBeNull();
    expect(within(barra).getByRole('link', { name: 'Chat IA' }).querySelector('.icono--activo')).toBeNull();
    expect(within(barra).getByText('Perfil')).toHaveClass('barra-inferior__texto');
  });

  test('el menú lateral tiene las secciones del mockup con "Profesionales" en vez de "Buscar profesionales"', () => {
    renderizarApp('/inicio');
    const menu = screen.getByRole('navigation', { name: 'Menú principal' });
    const nombres = within(menu).getAllByRole('link').map((enlace) => enlace.getAttribute('aria-label') ?? enlace.textContent.replace('Próximamente', '').trim());
    // Sin Farmacias ni Historial de chats (el historial vive dentro del asistente) y con Comidas (decisiones del PO del 05-10-2026).
    // El chat aparece dos veces: el botón de la tarjeta y el acceso con ícono del menú contraído (el CSS muestra solo uno).
    expect(nombres).toEqual(['Inicio', 'Profesionales', 'Centros de salud', 'Gimnasios', 'Asistente IA', 'Comidas', 'Mi perfil', 'Favoritos', 'Mis citas', 'Mensajes', 'Abrir chat', 'Abrir chat con el asistente IA']);
    expect(within(menu).queryByText('Buscar profesionales')).not.toBeInTheDocument();
    expect(within(menu).getByText('¿Necesitas una recomendación?')).toBeInTheDocument();
  });

  // Menú lateral en escritorio (18-11-2026, pedido del PO): siempre contraído a solo íconos, se despliega al acercar el
  // mouse o al recorrerlo con el teclado, y ya no tiene botón para contraerlo (reemplaza el menú compacto del 11-11-2026).
  test('el menú queda contraído, se despliega al acercar el mouse a los íconos y se contrae al salir', async () => {
    renderizarApp('/inicio');
    const menu = screen.getByRole('navigation', { name: 'Menú principal' });
    expect(menu).not.toHaveClass('menu-lateral--desplegado');
    expect(within(menu).queryByRole('button', { name: /Contraer menú|Expandir menú/ })).not.toBeInTheDocument();
    // Cada opción conserva su nombre para lectores de pantalla y la tarjeta del asistente tiene su acceso con ícono.
    expect(within(menu).getByRole('link', { name: 'Profesionales' })).toHaveAttribute('href', '/profesionales');
    expect(within(menu).getByRole('link', { name: 'Abrir chat con el asistente IA' })).toHaveAttribute('href', '/asistente/nuevo?inicio=profesional');

    const profesionales = within(menu).getByRole('link', { name: 'Profesionales' });
    await userEvent.hover(profesionales);
    await waitFor(() => expect(menu).toHaveClass('menu-lateral--desplegado'));
    // Elegir una opción con el mouse deja el foco en ella, pero el menú se contrae igual cuando el mouse se va.
    await userEvent.click(profesionales);
    expect(await screen.findByRole('heading', { level: 1, name: 'Profesionales' })).toBeInTheDocument();
    await userEvent.unhover(menu);
    await waitFor(() => expect(menu).not.toHaveClass('menu-lateral--desplegado'));
  });

  test('con el teclado el menú se despliega al entrar en él y se contrae al salir', async () => {
    renderizarApp('/inicio');
    const menu = screen.getByRole('navigation', { name: 'Menú principal' });
    const dentro = () => menu.contains(document.activeElement);
    // Antes del menú están el enlace para saltar al contenido y el encabezado.
    for (let paso = 0; paso < 20 && !dentro(); paso += 1) await userEvent.tab();
    expect(menu).toHaveClass('menu-lateral--desplegado');
    // Moverse dentro del menú no lo cierra; salir de él, sí.
    await userEvent.tab();
    expect(dentro()).toBe(true);
    expect(menu).toHaveClass('menu-lateral--desplegado');
    for (let paso = 0; paso < 20 && dentro(); paso += 1) await userEvent.tab({ shift: true });
    expect(menu).not.toHaveClass('menu-lateral--desplegado');
  });

  test('Shift+Tab desde el contenido entra al chat y conserva el foco al desplegar el menú', async () => {
    // JSDOM no aplica las media queries: reproducimos la visibilidad de los dos accesos en escritorio.
    const estilo = document.createElement('style');
    estilo.textContent = `
      .menu-lateral__chat { display: block; }
      .menu-lateral:not(.menu-lateral--desplegado) .tarjeta-recomendacion { display: none; }
      .menu-lateral--desplegado .tarjeta-recomendacion { display: grid; }
      .menu-lateral--desplegado .menu-lateral__chat { display: none; }
    `;
    document.head.append(estilo);
    try {
      renderizarApp('/inicio');
      const menu = screen.getByRole('navigation', { name: 'Menú principal' });
      // JSDOM no reconoce :focus-visible en este enlace al tabular hacia atrás.
      const compacto = within(menu).getByRole('link', { name: 'Abrir chat con el asistente IA' });
      const matches = compacto.matches.bind(compacto);
      vi.spyOn(compacto, 'matches').mockImplementation((selector) => selector === ':focus-visible' || matches(selector));
      const contenido = document.querySelector('main');
      for (let paso = 0; paso < 30 && !contenido.contains(document.activeElement); paso += 1) await userEvent.tab();
      expect(contenido.contains(document.activeElement)).toBe(true);
      expect(menu).not.toHaveClass('menu-lateral--desplegado');
      await userEvent.tab({ shift: true });
      expect(menu.contains(document.activeElement), document.activeElement.outerHTML).toBe(true);
      expect(menu).toHaveClass('menu-lateral--desplegado');
      const abrirChat = within(menu).getByRole('link', { name: 'Abrir chat', exact: true });
      expect(abrirChat).toHaveFocus();
      // Desde el acceso transferido se puede seguir recorriendo las opciones en ambos sentidos.
      await userEvent.tab({ shift: true });
      expect(within(menu).getByRole('link', { name: 'Mensajes', exact: true })).toHaveFocus();
      await userEvent.tab();
      expect(abrirChat).toHaveFocus();
      await userEvent.keyboard('{Enter}');
      await waitFor(() => expect(within(menu).getByRole('link', { name: 'Asistente IA', exact: true })).toHaveAttribute('aria-current', 'page'));
    } finally {
      estilo.remove();
    }
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

  test('el botón de menú del celular abre el menú y se cierra al navegar', async () => {
    renderizarApp('/inicio');
    const boton = screen.getByRole('button', { name: 'Abrir menú' });
    await userEvent.click(boton);
    expect(screen.getByRole('button', { name: 'Cerrar menú', expanded: true })).toBeInTheDocument();
    await userEvent.click(within(screen.getByRole('navigation', { name: 'Menú principal' })).getByRole('link', { name: 'Favoritos' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Favoritos' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Abrir menú' })).toHaveAttribute('aria-expanded', 'false');
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

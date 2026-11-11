// Espacio propio del profesional (DAS, D25 y D26): menú, Inicio con clima y separación de las pantallas del usuario.
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test } from 'vitest';
import {
  CLIMA, listado, MI_FICHA, PERFIL_COMPLETO, renderizarApp, respuestaPerfil, SESION, SESION_PROFESIONAL, simularApi,
} from '../../tests/utilidades.jsx';

const SALUDO = { level: 1, name: '¡Hola, Matías!' };
const simular = ({ ficha = MI_FICHA, clima = CLIMA } = {}) => simularApi({
  '/api/profesionales/mi-ficha': { ficha },
  '/api/clima': clima,
  '/api/disponibilidades': { horarios: [] },
});

beforeEach(() => sessionStorage.setItem('fitsearch_sesion', JSON.stringify(SESION_PROFESIONAL)));

describe('Separación por rol', () => {
  test.each(['/inicio', '/profesionales', '/favoritos', '/perfil', '/asistente'])('un profesional que entra a %s del usuario llega a su propio Inicio', async (ruta) => {
    simular();
    renderizarApp(ruta);
    expect(await screen.findByRole('heading', SALUDO)).toBeInTheDocument();
  });

  test('un usuario que entra al espacio del profesional llega a su propio Inicio', async () => {
    sessionStorage.setItem('fitsearch_sesion', JSON.stringify(SESION));
    simularApi({ '/api/perfil': respuestaPerfil(PERFIL_COMPLETO), '/api/profesionales': listado([]) });
    renderizarApp('/profesional/inicio');
    expect(await screen.findByRole('heading', { level: 1, name: /¿Cómo quieres cuidarte hoy\?/ })).toBeInTheDocument();
    expect(screen.queryByRole('heading', SALUDO)).not.toBeInTheDocument();
  });
});

describe('Diseño del profesional', () => {
  test('el menú lateral y la barra inferior son los del profesional', async () => {
    simular();
    renderizarApp('/profesional/inicio');
    await screen.findByRole('heading', SALUDO);

    const menu = screen.getByRole('navigation', { name: 'Menú principal' });
    const nombres = within(menu).getAllByRole('link').map((enlace) => enlace.textContent.replace('Próximamente', '').trim());
    expect(nombres).toEqual(['Inicio', 'Agenda', 'Clientes', 'Perfil profesional', 'Mensajes', 'Reportes', 'Configuración']);
    expect(within(menu).getByText('Mejores decisiones, mejores resultados.')).toBeInTheDocument();
    expect(within(menu).queryByText('¿Necesitas una recomendación?')).not.toBeInTheDocument();
    const barra = screen.getByRole('navigation', { name: 'Navegación inferior' });
    expect(within(barra).getAllByRole('link').map((enlace) => enlace.textContent)).toEqual(['Inicio', 'Agenda', 'Clientes', 'Perfil']);
    expect(screen.getByRole('link', { name: 'FitSearch, ir al inicio' })).toHaveAttribute('href', '/profesional/inicio');
  });

  test('el menú de la cuenta lleva al perfil profesional', async () => {
    simular();
    renderizarApp('/profesional/inicio');
    await userEvent.click(await screen.findByRole('button', { name: /menú de tu cuenta/ }));
    const panel = screen.getByText('matias@correo.cl').closest('div');
    expect(within(panel).getByRole('link', { name: 'Perfil profesional' })).toHaveAttribute('href', '/profesional/perfil');
    expect(within(panel).queryByRole('link', { name: 'Mi perfil' })).not.toBeInTheDocument();
  });

  test('una sección que aún no existe muestra "Próximamente" y vuelve al Inicio del profesional', async () => {
    simular();
    renderizarApp('/profesional/mensajes');
    expect(screen.getByRole('heading', { level: 1, name: 'Mensajes' })).toBeInTheDocument();
    expect(screen.getByText(/Pronto podrás leer los mensajes/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Volver al inicio' })).toHaveAttribute('href', '/profesional/inicio');
    expect(screen.queryByRole('link', { name: /Buscar profesionales/ })).not.toBeInTheDocument();
  });
});

describe('Inicio del profesional', () => {
  test('no solicita definir disponibilidad si ya hay horarios publicados', async () => {
    simularApi({ '/api/profesionales/mi-ficha': { ficha: MI_FICHA }, '/api/clima': CLIMA, '/api/disponibilidades': { horarios: [{ id: 1 }] } });
    renderizarApp('/profesional/inicio');
    await screen.findByRole('group', { name: 'Clima en Providencia: 18 grados, Despejado' });
    expect(screen.queryByText('Define tu disponibilidad')).not.toBeInTheDocument();
  });
  test('saluda, muestra el clima de su comuna con la fuente y, si el resumen no carga, no inventa datos', async () => {
    simular();
    renderizarApp('/profesional/inicio');

    expect(await screen.findByRole('heading', SALUDO)).toBeInTheDocument();
    const clima = await screen.findByRole('group', { name: 'Clima en Providencia: 18 grados, Despejado' });
    expect(within(clima).getByText('18°C')).toBeInTheDocument();
    expect(within(clima).getByRole('link', { name: 'Datos: Open-Meteo' })).toHaveAttribute('href', 'https://open-meteo.com/');
    const resumen = screen.getByRole('heading', { name: /Resumen semanal/ }).closest('section');
    expect(within(resumen).getAllByText('—')).toHaveLength(4);
    expect(within(resumen).queryByText('Próximamente')).not.toBeInTheDocument();
    expect(within(resumen).getByRole('link', { name: 'Ver reportes' })).toHaveAttribute('href', '/profesional/reportes');
  });

  test('el resumen semanal muestra los datos de la semana en curso (FS-HU-28)', async () => {
    simularApi({
      '/api/profesionales/mi-ficha': { ficha: MI_FICHA }, '/api/clima': CLIMA, '/api/disponibilidades': { horarios: [{ id: 1 }] },
      '/api/profesional/reportes': {
        resumenSemanal: { inicio: '2026-11-09', fin: '2026-11-15', totalClientes: 12, citasRealizadas: 3, citasPendientes: 2, clientesNuevos: 1 },
      },
    });
    renderizarApp('/profesional/inicio');
    const resumen = (await screen.findByRole('heading', { name: /Resumen semanal/ })).closest('section');
    const valor = (nombre) => within(resumen).getByText(nombre).closest('li').querySelector('strong').textContent;
    expect(await within(resumen).findByText('12')).toBeInTheDocument();
    expect([valor('Total de clientes'), valor('Citas realizadas'), valor('Citas por confirmar'), valor('Clientes nuevos')]).toEqual(['12', '3', '2', '1']);
    expect(within(resumen).getByText(/Semana del 9 nov al 15 nov/)).toBeInTheDocument();
    // Las citas por confirmar también aparecen como tarea, con acceso a la agenda.
    const tarea = screen.getByText('Tienes 2 citas por confirmar').closest('li');
    expect(within(tarea).getByRole('link', { name: /Revisar/ })).toHaveAttribute('href', '/profesional/agenda');
  });

  test('sin tareas pendientes lo dice en vez de dejar el panel vacío', async () => {
    simularApi({ '/api/profesionales/mi-ficha': { ficha: MI_FICHA }, '/api/clima': CLIMA, '/api/disponibilidades': { horarios: [{ id: 1 }] } });
    renderizarApp('/profesional/inicio');
    expect(await screen.findByText('Estás al día: no tienes tareas pendientes.')).toBeInTheDocument();
  });

  test('si el clima no está disponible, el Inicio funciona igual sin esa tarjeta', async () => {
    simular({ clima: () => [503, { error: 'El clima no está disponible en este momento' }] });
    renderizarApp('/profesional/inicio');

    expect(await screen.findByRole('heading', SALUDO)).toBeInTheDocument();
    expect(await screen.findByText('Define tu disponibilidad')).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: /Clima en/ })).not.toBeInTheDocument();
    expect(screen.queryByText(/no está disponible/)).not.toBeInTheDocument();
  });

  test('sin ficha, la primera tarea es completarla para aparecer en el buscador', async () => {
    simular({ ficha: null });
    renderizarApp('/profesional/inicio');

    expect(await screen.findByText('Completa tu ficha profesional')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Completar/ })).toHaveAttribute('href', '/profesional/perfil');
    // La agenda ya permite publicar disponibilidad (FS-HU-13).
    const tarea = screen.getByText('Define tu disponibilidad').closest('li');
    expect(within(tarea).getByRole('link', { name: /Publicar horario/ })).toHaveAttribute('href', '/profesional/agenda');
  });

  test('con ficha pero sin descripción, sugiere agregarla', async () => {
    simular({ ficha: { ...MI_FICHA, descripcion: '' } });
    renderizarApp('/profesional/inicio');

    expect(await screen.findByText('Agrega una descripción a tu ficha')).toBeInTheDocument();
    expect(screen.queryByText('Completa tu ficha profesional')).not.toBeInTheDocument();
  });

  test('los accesos rápidos llevan a las secciones del profesional', async () => {
    simular();
    renderizarApp('/profesional/inicio');
    const accesos = (await screen.findByRole('heading', { name: 'Accesos rápidos' })).closest('section');
    expect(within(accesos).getByRole('link', { name: /Mi perfil profesional/ })).toHaveAttribute('href', '/profesional/perfil');
    expect(within(accesos).getByRole('link', { name: /Publicar horario/ })).toHaveAttribute('href', '/profesional/agenda');
    expect(within(accesos).getByRole('link', { name: 'Clientes' })).toHaveAttribute('href', '/profesional/clientes');
    // Solo Mensajes sigue pendiente.
    expect(within(accesos).getAllByText('Próximamente')).toHaveLength(1);
  });
});

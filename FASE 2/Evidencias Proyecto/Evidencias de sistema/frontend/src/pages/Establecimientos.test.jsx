// Directorio de centros de salud y gimnasios (FS-HU-25): lista, filtros por comuna y distancia, estado vacío y ficha.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { fichaProfesional, llamadasA, parametrosDe, renderizarApp, SESION, simularApi, simularUbicacion } from '../tests/utilidades.jsx';

// El mapa tiene sus propias pruebas (MapaProfesionales.test.jsx). Aquí MapLibre no termina de cargar, como en un
// navegador sin conexión a la CDN, para probar solo el directorio.
vi.mock('../services/mapas.js', () => ({ cargarMapLibre: () => new Promise(() => {}), ESTILO_MAPA: 'https://estilo.prueba/style.json' }));

beforeEach(() => sessionStorage.setItem('fitsearch_sesion', JSON.stringify(SESION)));

const establecimiento = (sobrescribir = {}) => ({
  id: 3, nombre: 'Gimnasio Demo', categoria: 'gimnasio', comuna: 'Ñuñoa', direccion: 'Av. Irarrázaval 1000',
  ubicacionLat: -33.454, ubicacionLng: -70.598, distanciaKm: null, totalProfesionales: 2, ...sobrescribir,
});
const pagina = (lista, total = lista.length) => ({ establecimientos: lista, pagina: 1, total, totalPaginas: Math.ceil(total / 12), hayMas: total > 12 });
const GIMNASIOS = [establecimiento(), establecimiento({ id: 4, nombre: 'Box Funcional', comuna: 'Providencia', direccion: 'Los Leones 50', totalProfesionales: 0 })];

function simular({ listado = () => pagina(GIMNASIOS), ficha } = {}) {
  return simularApi({
    '/api/establecimientos/filtros': { comunas: ['Ñuñoa', 'Providencia'] },
    '/api/establecimientos': (url) => (/^\/api\/establecimientos\/\d+/.test(url) && ficha ? ficha(url) : [200, listado(url)]),
  });
}
const consultas = (fetch) => llamadasA(fetch, '/api/establecimientos').filter(([url]) => /^\/api\/establecimientos\?/.test(url));
const ultimaConsulta = (fetch) => parametrosDe(consultas(fetch).at(-1)?.[0] || '/');
const esperarConsulta = (fetch, esperado) => waitFor(() => expect(ultimaConsulta(fetch)).toEqual(esperado));

describe('Lista', () => {
  test('muestra los gimnasios registrados con su categoría y su dirección', async () => {
    const fetch = simular();
    renderizarApp('/gimnasios');

    expect(screen.getByRole('heading', { level: 1, name: 'Gimnasios' })).toBeInTheDocument();
    const demo = (await screen.findByRole('heading', { name: 'Gimnasio Demo' })).closest('article');
    expect(within(demo).getByText('Gimnasio', { selector: '.tarjeta-profesional__especialidad' })).toBeInTheDocument();
    expect(within(demo).getByText('Av. Irarrázaval 1000, Ñuñoa')).toBeInTheDocument();
    expect(within(demo).getByRole('link', { name: 'Gimnasio Demo' })).toHaveAttribute('href', '/gimnasios/3');
    expect(within(screen.getByRole('heading', { name: 'Box Funcional' }).closest('article')).getByText('Los Leones 50, Providencia')).toBeInTheDocument();
    // La lista no muestra cuántos profesionales atienden en cada uno: eso queda en la ficha (decisión del PO).
    expect(screen.queryByText(/profesionales? asociados?/)).not.toBeInTheDocument();
    expect(screen.getByText('2 gimnasios encontrados')).toBeInTheDocument();
    expect(ultimaConsulta(fetch)).toEqual({ categoria: 'gimnasio' });
    // Ya no es una sección «Próximamente».
    expect(screen.queryByText(/Pronto podrás/)).not.toBeInTheDocument();
  });

  test('Centros de salud usa la misma pantalla con su categoría', async () => {
    const fetch = simular({ listado: () => pagina([establecimiento({ nombre: 'Centro Médico Demo', categoria: 'centro_salud' })]) });
    renderizarApp('/centros-salud');
    expect(screen.getByRole('heading', { level: 1, name: 'Centros de salud' })).toBeInTheDocument();
    expect(await screen.findByText('1 centro de salud encontrado')).toBeInTheDocument();
    expect(ultimaConsulta(fetch)).toEqual({ categoria: 'centro_salud' });
    expect(llamadasA(fetch, '/api/establecimientos/filtros').at(-1)[0]).toBe('/api/establecimientos/filtros?categoria=centro_salud');
  });

  test('filtra por comuna y «Quitar filtros» vuelve a la lista completa', async () => {
    const fetch = simular();
    renderizarApp('/gimnasios');
    await screen.findByRole('heading', { name: 'Gimnasio Demo' });

    await userEvent.selectOptions(screen.getByLabelText('Comuna'), 'Providencia');
    await esperarConsulta(fetch, { categoria: 'gimnasio', comuna: 'Providencia' });
    await userEvent.click(screen.getByRole('button', { name: 'Quitar filtros' }));
    await esperarConsulta(fetch, { categoria: 'gimnasio' });
    expect(screen.getByLabelText('Comuna')).toHaveValue('');
  });

  test('una distancia pide la ubicación y ordena del más cercano al más lejano', async () => {
    simularUbicacion();
    const fetch = simular({ listado: () => pagina(GIMNASIOS.map((g, i) => ({ ...g, distanciaKm: i ? 3.8 : 1.3 }))) });
    renderizarApp('/gimnasios');
    await screen.findByRole('heading', { name: 'Gimnasio Demo' });

    await userEvent.selectOptions(screen.getByLabelText('Distancia'), 'Hasta 5 km');
    await esperarConsulta(fetch, { categoria: 'gimnasio', lat: '-33.437', lng: '-70.65', orden: 'cercania', distanciaKm: '5' });
    expect(await screen.findByText('2 gimnasios encontrados, del más cercano al más lejano')).toBeInTheDocument();
    expect(within(screen.getByRole('heading', { name: 'Gimnasio Demo' }).closest('article')).getByText('Av. Irarrázaval 1000, Ñuñoa · 1,3 km')).toBeInTheDocument();
  });

  test('sin permiso de ubicación avisa, ofrece la comuna y no envía la distancia', async () => {
    simularUbicacion({ error: 1 });
    const fetch = simular();
    renderizarApp('/gimnasios?distancia=5');
    expect(await screen.findByText(/No tenemos permiso para usar tu ubicación\. Actívalo en tu navegador o elige una comuna\./)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Intentar de nuevo' })).toBeInTheDocument();
    await esperarConsulta(fetch, { categoria: 'gimnasio' });
  });

  test('sin resultados con filtros lo indica y ofrece quitarlos, sin inventar datos', async () => {
    const fetch = simular({ listado: (url) => (parametrosDe(url).comuna ? pagina([]) : pagina(GIMNASIOS)) });
    renderizarApp('/gimnasios?comuna=Lo%20Barnechea');
    expect(await screen.findByRole('heading', { name: 'No encontramos gimnasios con esos filtros' })).toBeInTheDocument();
    expect(screen.queryByRole('article')).not.toBeInTheDocument();
    // La comuna de la URL se ve elegida aunque ya no tenga gimnasios.
    expect(screen.getByLabelText('Comuna')).toHaveValue('Lo Barnechea');
    const [vacio] = screen.getAllByRole('button', { name: 'Quitar filtros' }).filter((boton) => boton.closest('.estado-vacio'));
    await userEvent.click(vacio);
    expect(await screen.findByRole('heading', { name: 'Gimnasio Demo' })).toBeInTheDocument();
    expect(ultimaConsulta(fetch)).toEqual({ categoria: 'gimnasio' });
  });

  test('sin establecimientos registrados lo dice sin mostrar un mapa vacío', async () => {
    simular({ listado: () => pagina([]) });
    renderizarApp('/centros-salud');
    expect(await screen.findByRole('heading', { name: 'Aún no hay centros de salud para mostrar' })).toBeInTheDocument();
    expect(document.querySelector('.buscador__mapa')).toHaveAttribute('hidden');
  });

  test('si la API falla muestra el error y permite reintentar', async () => {
    let fallar = true;
    simularApi({
      '/api/establecimientos/filtros': { comunas: [] },
      '/api/establecimientos': () => (fallar ? [500, { error: 'Ocurrió un error inesperado' }] : [200, pagina(GIMNASIOS)]),
    });
    renderizarApp('/gimnasios');
    expect(await screen.findByText('Ocurrió un error inesperado')).toBeInTheDocument();
    fallar = false;
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByRole('heading', { name: 'Gimnasio Demo' })).toBeInTheDocument();
  });

  test('«Ver en el mapa» marca la tarjeta con el acento, como en Profesionales, y muestra su detalle bajo el mapa', async () => {
    simular();
    renderizarApp('/gimnasios');
    const demo = (await screen.findByRole('heading', { name: 'Gimnasio Demo' })).closest('article');
    await userEvent.click(within(demo).getByRole('button', { name: 'Ver Gimnasio Demo en el mapa' }));
    expect(within(demo).getByRole('button', { name: 'Ver Gimnasio Demo en el mapa' })).toHaveAttribute('aria-pressed', 'true');
    expect(demo).toHaveClass('tarjeta-profesional--seleccionada');
    const detalle = screen.getByRole('region', { name: 'Gimnasio Demo' });
    expect(within(detalle).getByText('Av. Irarrázaval 1000, Ñuñoa')).toBeInTheDocument();
    expect(within(detalle).queryByText(/profesionales? asociados?/)).not.toBeInTheDocument();
    expect(within(detalle).getByRole('link', { name: 'Ver ficha' })).toHaveAttribute('href', '/gimnasios/3');
    expect(within(detalle).getByRole('link', { name: /Cómo llegar/ }))
      .toHaveAttribute('href', 'https://www.google.com/maps/search/?api=1&query=-33.454%2C-70.598');
    await userEvent.click(within(detalle).getByRole('button', { name: 'Cerrar detalle' }));
    expect(screen.queryByRole('region', { name: 'Gimnasio Demo' })).not.toBeInTheDocument();
    expect(demo).not.toHaveClass('tarjeta-profesional--seleccionada');
  });
});

describe('Ficha', () => {
  const FICHA = {
    establecimiento: {
      ...establecimiento(), totalProfesionales: 2,
      profesionales: [
        { id: 8, nombre: 'Ana Demo', especialidad: 'Entrenamiento personal', modalidad: 'presencial', verificado: true },
        { id: 9, nombre: 'Luis Prueba', especialidad: 'Kinesiología', modalidad: 'ambas', verificado: false },
      ],
    },
  };

  test('muestra nombre, categoría, dirección, mapa y los profesionales asociados', async () => {
    simular({ ficha: () => [200, FICHA] });
    renderizarApp('/gimnasios/3');
    expect(await screen.findByRole('heading', { level: 1, name: 'Gimnasio Demo' })).toBeInTheDocument();
    expect(screen.getByText('Gimnasio', { selector: '.ficha-establecimiento__categoria' })).toBeInTheDocument();
    expect(screen.getByText('Av. Irarrázaval 1000, Ñuñoa')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Ubicación de Gimnasio Demo en el mapa' })).toBeInTheDocument();
    const asociados = screen.getByRole('heading', { name: 'Profesionales que atienden aquí' }).closest('section');
    const ana = within(asociados).getByRole('link', { name: /Ana Demo/ });
    expect(ana).toHaveAttribute('href', '/profesionales/8');
    expect(within(ana).getByText('Verificado')).toBeInTheDocument();
    expect(within(within(asociados).getByRole('link', { name: /Luis Prueba/ })).queryByText('Verificado')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Volver a gimnasios' })).toHaveAttribute('href', '/gimnasios');
  });

  // Gimnasios de San Antonio (11-11-2026): los que tienen Instagram lo muestran en su tarjeta y en su ficha.
  test('el Instagram del gimnasio aparece en la tarjeta y en la ficha y abre su perfil en otra pestaña', async () => {
    simular({
      listado: () => pagina([establecimiento({ id: 7, nombre: 'Gimnasio Pacific San Antonio', comuna: 'San Antonio', direccion: 'Centenario 396', instagram: 'pacific_sanantonio' }), GIMNASIOS[1]]),
      ficha: () => [200, { establecimiento: { ...FICHA.establecimiento, instagram: 'pacific_sanantonio' } }],
    });
    renderizarApp('/gimnasios');
    const pacific = (await screen.findByRole('heading', { name: 'Gimnasio Pacific San Antonio' })).closest('article');
    const enlace = within(pacific).getByRole('link', { name: 'Instagram de Gimnasio Pacific San Antonio: @pacific_sanantonio (se abre en otra pestaña)' });
    expect(enlace).toHaveAttribute('href', 'https://www.instagram.com/pacific_sanantonio/');
    expect(enlace).toHaveAttribute('target', '_blank');
    expect(enlace).toHaveAttribute('rel', 'noopener noreferrer');
    // Sin cuenta de Instagram no se muestra el enlace.
    expect(within(screen.getByRole('heading', { name: 'Box Funcional' }).closest('article')).queryByRole('link', { name: /Instagram/ })).not.toBeInTheDocument();
  });

  test('la ficha muestra el Instagram del gimnasio', async () => {
    simular({ ficha: () => [200, { establecimiento: { ...FICHA.establecimiento, instagram: 'pacific_sanantonio' } }] });
    renderizarApp('/gimnasios/3');
    expect(await screen.findByRole('link', { name: /Instagram de Gimnasio Demo: @pacific_sanantonio/ })).toHaveAttribute('href', 'https://www.instagram.com/pacific_sanantonio/');
  });

  test('sin profesionales asociados lo indica', async () => {
    simular({ ficha: () => [200, { establecimiento: { ...FICHA.establecimiento, totalProfesionales: 0, profesionales: [] } }] });
    renderizarApp('/gimnasios/3');
    expect(await screen.findByText('Aún no hay profesionales asociados')).toBeInTheDocument();
  });

  test('un establecimiento que no existe o se desactivó muestra un aviso con el camino de vuelta', async () => {
    simular({ ficha: () => [404, { error: 'No encontramos ese establecimiento' }] });
    renderizarApp('/gimnasios/99');
    expect(await screen.findByRole('heading', { name: 'No encontramos este gimnasio' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver gimnasios' })).toHaveAttribute('href', '/gimnasios');
  });

  test('un enlace con la categoría equivocada lleva a la dirección correcta', async () => {
    simular({ ficha: () => [200, { establecimiento: { ...FICHA.establecimiento, categoria: 'centro_salud', nombre: 'Centro Médico Demo' } }] });
    renderizarApp('/gimnasios/3');
    expect(await screen.findByRole('heading', { level: 1, name: 'Centro Médico Demo' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Volver a centros de salud' })).toHaveAttribute('href', '/centros-salud');
  });

  test('desde la lista filtrada, «Volver» regresa a la misma búsqueda', async () => {
    simular({ ficha: () => [200, FICHA] });
    renderizarApp('/gimnasios?comuna=%C3%91u%C3%B1oa');
    await userEvent.click(await screen.findByRole('link', { name: 'Gimnasio Demo' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Gimnasio Demo' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Volver a gimnasios' })).toHaveAttribute('href', '/gimnasios?comuna=%C3%91u%C3%B1oa');
  });

  // Revisión del PR #47: el recorrido lista → establecimiento → profesional → «Volver» → establecimiento → «Volver».
  test('desde la ficha de un gimnasio, el profesional vuelve al gimnasio y este a la búsqueda filtrada', async () => {
    simularApi({
      '/api/establecimientos/filtros': { comunas: ['Ñuñoa'] },
      '/api/establecimientos': (url) => [200, /^\/api\/establecimientos\/\d+/.test(url) ? FICHA : pagina(GIMNASIOS)],
      '/api/profesionales/8/resenas': { resenas: [], pagina: 1, total: 0, totalPaginas: 0 },
      '/api/profesionales/8': {
        profesional: fichaProfesional({ id: 8, nombre: 'Ana Demo', especialidad: 'Entrenamiento personal' }),
        resumenResenas: { promedio: null, total: 0, distribucion: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } }, miResena: null, puedeResenar: true,
      },
    });
    renderizarApp('/gimnasios?comuna=%C3%91u%C3%B1oa');
    await userEvent.click(await screen.findByRole('link', { name: 'Gimnasio Demo' }));
    await userEvent.click(await screen.findByRole('link', { name: /Ana Demo/ }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Ana Demo' })).toBeInTheDocument();

    const volverAlGimnasio = screen.getByRole('link', { name: 'Volver a Gimnasio Demo' });
    expect(volverAlGimnasio).toHaveAttribute('href', '/gimnasios/3');
    await userEvent.click(volverAlGimnasio);
    expect(await screen.findByRole('heading', { level: 1, name: 'Gimnasio Demo' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Volver a gimnasios' })).toHaveAttribute('href', '/gimnasios?comuna=%C3%91u%C3%B1oa');
  });
});

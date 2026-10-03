// Buscador de profesionales con texto, filtros, orden, páginas y estado en la URL (FS-HU-03, FS-HU-05, FS-HU-22).
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import {
  fichaProfesional, FILTROS, listado, llamadasA, parametrosDe, renderizarApp, respuestaJson, SESION, simularApi, simularUbicacion,
} from '../tests/utilidades.jsx';

beforeEach(() => sessionStorage.setItem('fitsearch_sesion', JSON.stringify(SESION)));

const camila = fichaProfesional({
  id: 2, nombre: 'Camila Demo', especialidad: 'Kinesiología', comuna: 'Ñuñoa', modalidad: 'online', establecimiento: null,
  calificacion: { promedio: null, total: 0 },
});
function simular(respuestaListado = () => listado([fichaProfesional(), camila])) {
  return simularApi({
    '/api/profesionales/filtros': FILTROS,
    '/api/profesionales': (url) => [200, respuestaListado(url)],
  });
}
// Parámetros de la última consulta del listado (sin contar /filtros ni las fichas individuales).
const ultimaConsulta = (fetch) => parametrosDe(llamadasA(fetch, '/api/profesionales')
  .filter(([url]) => /^\/api\/profesionales(\?|$)/.test(url)).at(-1)?.[0] || '/');
const esperarConsulta = (fetch, esperado) => waitFor(() => expect(ultimaConsulta(fetch)).toMatchObject(esperado));

describe('Resultados', () => {
  test('muestra las fichas de la API con especialidad, calificación, comuna y modalidad, y el total encontrado', async () => {
    simular(); renderizarApp('/profesionales');

    const ana = (await screen.findByRole('heading', { name: 'Ana Demo' })).closest('article');
    expect(within(ana).getByText('Nutrición')).toBeInTheDocument();
    expect(within(ana).getByRole('img', { name: 'Calificación 4,5 de 5, 12 reseñas' })).toBeInTheDocument();
    expect(within(ana).getByText('Melipilla')).toBeInTheDocument();
    expect(within(ana).getByText('Presencial y online')).toBeInTheDocument();
    const fichaCamila = screen.getByRole('heading', { name: 'Camila Demo' }).closest('article');
    expect(within(fichaCamila).getByText('Sin reseñas aún')).toBeInTheDocument();
    expect(screen.getByText('2 profesionales encontrados')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ana Demo' })).toHaveAttribute('href', '/profesionales/1');
  });

  test('el encabezado no tiene buscador falso ni acceso a Profesionales (ya están el menú lateral y la barra inferior)', async () => {
    simular(); renderizarApp('/profesionales');
    await screen.findByRole('heading', { name: 'Ana Demo' });
    const encabezado = document.querySelector('.encabezado');
    expect(within(encabezado).queryByRole('link', { name: /Profesionales/ })).not.toBeInTheDocument();
    expect(within(screen.getByRole('navigation', { name: 'Menú principal' })).getByRole('link', { name: 'Profesionales' })).toHaveAttribute('href', '/profesionales');
    expect(within(screen.getByRole('navigation', { name: 'Navegación inferior' })).getByRole('link', { name: 'Profesionales' })).toHaveAttribute('href', '/profesionales');
    expect(within(encabezado).queryByRole('textbox')).not.toBeInTheDocument();
    expect(within(encabezado).queryByRole('searchbox')).not.toBeInTheDocument();
  });

  test('sin registros muestra un estado vacío', async () => {
    simular(() => listado([])); renderizarApp('/profesionales');
    expect(await screen.findByRole('heading', { name: 'Aún no hay profesionales para mostrar' })).toBeInTheDocument();
  });

  test('muestra la carga y permite reintentar tras un fallo de red', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Sin red'));
    renderizarApp('/profesionales');
    expect(screen.getAllByRole('status').some((elemento) => elemento.textContent.includes('Cargando profesionales'))).toBe(true);
    await screen.findByRole('button', { name: 'Reintentar' });
    fetch.mockImplementation((url) => respuestaJson(200, url.includes('/filtros') ? FILTROS : listado()));
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByRole('heading', { name: 'Ana Demo' })).toBeInTheDocument();
  });

  test('pagina los resultados y conserva los filtros al cambiar de página', async () => {
    const fetch = simular((url) => listado([fichaProfesional()], { pagina: Number(parametrosDe(url).pagina || 1), total: 30 }));
    renderizarApp('/profesionales?especialidad=Nutrici%C3%B3n');
    expect(await screen.findByText('Página 1 de 3')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    expect(await screen.findByText('Página 2 de 3')).toBeInTheDocument();
    expect(ultimaConsulta(fetch)).toEqual({ especialidad: 'Nutrición', pagina: '2' });
  });
});

describe('Búsqueda por texto y estado en la URL', () => {
  test('llega desde el buscador del Inicio con ?q= y busca ese texto', async () => {
    const fetch = simular(); renderizarApp('/profesionales?q=nutri');
    expect(screen.getByRole('searchbox', { name: 'Buscar profesionales' })).toHaveValue('nutri');
    await esperarConsulta(fetch, { q: 'nutri' });
    expect(await screen.findByRole('button', { name: 'Quitar filtro: “nutri”' })).toBeInTheDocument();
  });

  test('buscar un texto lo envía a la API y vuelve a la primera página', async () => {
    const fetch = simular(); renderizarApp('/profesionales?pagina=2');
    await screen.findByRole('heading', { name: 'Ana Demo' });
    await userEvent.type(screen.getByRole('searchbox', { name: 'Buscar profesionales' }), 'kinesiología rodilla');
    await userEvent.click(screen.getByRole('button', { name: 'Buscar' }));
    await esperarConsulta(fetch, { q: 'kinesiología rodilla' });
    expect(ultimaConsulta(fetch).pagina).toBeUndefined();
  });

  test('envía el token en el listado y en el catálogo de filtros', async () => {
    const fetch = simular(); renderizarApp('/profesionales');
    await screen.findByRole('heading', { name: 'Ana Demo' });
    for (const [, opciones] of llamadasA(fetch, '/api/profesionales')) {
      expect(opciones.headers.Authorization).toBe(`Bearer ${SESION.token}`);
    }
    expect(llamadasA(fetch, '/api/profesionales/filtros')).not.toHaveLength(0);
  });
});

describe('Filtros y orden', () => {
  test('especialidad, comuna, calificación y modalidad se envían a la API y aparecen como filtros aplicados', async () => {
    const fetch = simular(); renderizarApp('/profesionales');
    await screen.findByRole('heading', { name: 'Ana Demo' });

    await userEvent.selectOptions(screen.getByLabelText('Especialidad'), 'Kinesiología');
    await userEvent.selectOptions(screen.getByLabelText('Comuna'), 'Ñuñoa');
    await userEvent.click(screen.getByRole('radio', { name: '4 estrellas o más' }));
    await userEvent.click(screen.getByRole('radio', { name: 'Online' }));

    await esperarConsulta(fetch, { especialidad: 'Kinesiología', comuna: 'Ñuñoa', calificacionMin: '4', modalidad: 'online' });
    const aplicados = screen.getByRole('group', { name: 'Filtros aplicados' });
    for (const texto of ['Kinesiología', 'Ñuñoa', '4 estrellas o más', 'Online']) {
      expect(within(aplicados).getByRole('button', { name: `Quitar filtro: ${texto}` })).toBeInTheDocument();
    }
    expect(screen.getByRole('button', { name: /^Filtros \(4\)/ })).toBeInTheDocument();

    await userEvent.click(within(aplicados).getByRole('button', { name: 'Quitar filtro: Ñuñoa' }));
    await waitFor(() => expect(ultimaConsulta(fetch).comuna).toBeUndefined());
  });

  test('ordena por mejor calificados o por más reseñas', async () => {
    const fetch = simular(); renderizarApp('/profesionales');
    await screen.findByRole('heading', { name: 'Ana Demo' });
    await userEvent.selectOptions(screen.getByLabelText('Ordenar por'), 'Mejor calificados');
    await esperarConsulta(fetch, { orden: 'calificacion' });
    await userEvent.selectOptions(screen.getByLabelText('Ordenar por'), 'Más reseñas');
    await esperarConsulta(fetch, { orden: 'resenas' });
  });

  test('sin coincidencias muestra el estado vacío y "Limpiar filtros" vuelve a mostrar todo', async () => {
    const fetch = simular((url) => (parametrosDe(url).comuna ? listado([]) : listado()));
    renderizarApp('/profesionales?comuna=Melipilla&q=zzz');
    expect(await screen.findByRole('heading', { name: 'No encontramos profesionales con esos filtros' })).toBeInTheDocument();
    await userEvent.click(screen.getAllByRole('button', { name: 'Limpiar filtros' })[0]);
    expect(await screen.findByRole('heading', { name: 'Ana Demo' })).toBeInTheDocument();
    expect(ultimaConsulta(fetch)).toEqual({});
    expect(screen.getByRole('searchbox', { name: 'Buscar profesionales' })).toHaveValue('');
  });

  test('en celular el botón "Filtros" abre el panel y "Ver resultados" lo cierra', async () => {
    simular(); renderizarApp('/profesionales');
    await screen.findByRole('heading', { name: 'Ana Demo' });
    const boton = screen.getByRole('button', { name: /^Filtros/ });
    expect(boton).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(boton);
    expect(boton).toHaveAttribute('aria-expanded', 'true');
    await userEvent.click(screen.getByRole('button', { name: 'Ver 2 resultados' }));
    expect(boton).toHaveAttribute('aria-expanded', 'false');
  });
});

describe('Cercanía con la ubicación del navegador (FS-HU-05)', () => {
  test('escenario 1: con permiso, filtra por distancia con la ubicación redondeada y ordena por cercanía', async () => {
    const posicion = simularUbicacion();
    const fetch = simular(() => listado([fichaProfesional({ distanciaKm: 2.3 })]));
    renderizarApp('/profesionales');
    await screen.findByRole('heading', { name: 'Ana Demo' });

    await userEvent.selectOptions(screen.getByLabelText('Distancia máxima'), 'Hasta 5 km');
    await esperarConsulta(fetch, { distanciaKm: '5', lat: '-33.437', lng: '-70.65' });
    expect(posicion).toHaveBeenCalled();
    expect(await screen.findByText('Melipilla · 2,3 km')).toBeInTheDocument();
    expect(screen.getByText('Usando tu ubicación aproximada.')).toBeInTheDocument();

    await userEvent.selectOptions(screen.getByLabelText('Ordenar por'), 'Más cercanos');
    await esperarConsulta(fetch, { orden: 'cercania', distanciaKm: '5' });
  });

  test('escenario 2: sin permiso, explica cómo seguir y busca sin la distancia', async () => {
    simularUbicacion({ error: 1 });
    const fetch = simular();
    renderizarApp('/profesionales?distancia=5');

    expect(await screen.findByText(/No tenemos permiso para usar tu ubicación/)).toBeInTheDocument();
    await screen.findByRole('heading', { name: 'Ana Demo' });
    expect(ultimaConsulta(fetch).distanciaKm).toBeUndefined();
    expect(ultimaConsulta(fetch).lat).toBeUndefined();
    expect(screen.getByRole('button', { name: 'Intentar de nuevo' })).toBeInTheDocument();
  });

  test('si ya había dado permiso, muestra la distancia sin volver a preguntar', async () => {
    simularUbicacion({ permiso: 'granted' });
    const fetch = simular();
    renderizarApp('/profesionales');
    await waitFor(() => expect(ultimaConsulta(fetch)).toMatchObject({ lat: '-33.437', lng: '-70.65' }));
    expect(ultimaConsulta(fetch).distanciaKm).toBeUndefined();
  });
});

describe('Sesión', () => {
  test('un visitante debe iniciar sesión antes de consultar el directorio', async () => {
    sessionStorage.clear();
    const fetch = simular();
    renderizarApp('/profesionales');
    expect(await screen.findByRole('heading', { name: /bienvenido/i })).toBeInTheDocument();
    expect(llamadasA(fetch, '/api/profesionales')).toHaveLength(0);
  });

  test('una sesión vencida vuelve al inicio de sesión', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(() => respuestaJson(401, { error: 'Sesión vencida' }));
    renderizarApp('/profesionales');
    expect(await screen.findByRole('heading', { name: /bienvenido/i })).toBeInTheDocument();
    expect(sessionStorage.getItem('fitsearch_sesion')).toBeNull();
  });
});

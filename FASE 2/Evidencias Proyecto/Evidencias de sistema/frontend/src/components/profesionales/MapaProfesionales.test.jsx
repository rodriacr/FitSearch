import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { cargarMapLibre } from '../../services/mapas.js';
import MapaProfesionales from './MapaProfesionales.jsx';
import DetalleEnMapa from './DetalleEnMapa.jsx';
import { fichaProfesional, listado, FILTROS, llamadasA, renderizarApp, SESION, simularApi } from '../../tests/utilidades.jsx';
vi.mock('../../services/mapas.js', () => ({ cargarMapLibre: vi.fn(), ESTILO_MAPA: 'https://estilo.prueba/style.json' }));
beforeEach(() => cargarMapLibre.mockReset());

// MapLibre simulado: registra mapas y marcadores para revisar lo que dibuja el componente. Como en MapLibre, el
// elemento de cada marcador (el botón que crea el componente) se agrega dentro del contenedor del mapa.
// Con cargaManual el estilo no termina de cargar hasta llamar registro.cargarEstilo(); registro.emitirError(url) simula
// el evento error de MapLibre (por ejemplo, la descarga del estilo que falla).
function simularMapLibre({ cargaManual = false } = {}) {
  const registro = {
    mapas: [], marcadores: [], extendidos: [], centros: [], fitBounds: vi.fn(), easeTo: vi.fn(), cargarEstilo: () => {},
    emitirError: (url) => [...registro.mapas.at(-1).oyentesError].forEach((cb) => cb({ error: { url, status: 0 } })),
  };
  class Map {
    constructor(opciones) { this.opciones = opciones; this.remove = vi.fn(); this.oyentesError = new Set(); registro.mapas.push(this); }
    once(evento, cb) {
      if (evento === 'idle') registro.terminarDibujo = cb;
      if (evento !== 'load') return;
      if (cargaManual) registro.cargarEstilo = cb;
      else queueMicrotask(cb);
    }
    on(evento, cb) { if (evento === 'error') this.oyentesError.add(cb); return this; }
    off(evento, cb) { if (evento === 'error') this.oyentesError.delete(cb); return this; }
    addControl() {}
    resize() {}
    setCenter(centro) { registro.centros.push(centro); }
    setZoom() {}
    getZoom() { return 11; }
    fitBounds(...args) { registro.fitBounds(...args); }
    easeTo(...args) { registro.easeTo(...args); }
  }
  class LngLatBounds { extend(punto) { registro.extendidos.push(punto); } }
  class NavigationControl {}
  class Marker {
    constructor(opciones) {
      this.opciones = opciones; this.elemento = opciones.element; registro.marcadores.push(this);
      this.remove = vi.fn(() => this.elemento.remove());
    }
    setLngLat(posicion) { this.posicion = posicion; return this; }
    addTo(mapa) { mapa.opciones.container.append(this.elemento); return this; }
    getElement() { return this.elemento; }
  }
  cargarMapLibre.mockResolvedValue({ Map, LngLatBounds, NavigationControl, Marker });
  return registro;
}
const fallarProveedor = () => cargarMapLibre.mockResolvedValue({ Map: class { constructor() { throw new Error('Mapa no disponible'); } } });
const mapa = (props) => <MemoryRouter><MapaProfesionales {...props} /></MemoryRouter>;
const otro = fichaProfesional({ id: 2, nombre: 'Otro profesional', especialidad: 'Kinesiología', ubicacionLat: -33.45, ubicacionLng: -70.66 });

describe('Mapa', () => {
  test('cada profesional es un botón en el mapa con su nombre: elegirlo o pasar por él avisa a la página', async () => {
    const registro = simularMapLibre();
    const onSeleccionar = vi.fn();
    const onResaltar = vi.fn();
    render(mapa({ profesionales: [fichaProfesional(), otro], onSeleccionar, onResaltar }));
    await waitFor(() => expect(registro.marcadores).toHaveLength(2));
    const [ana] = registro.marcadores;
    expect(ana.opciones).toMatchObject({ anchor: 'bottom' });
    expect(ana.posicion).toEqual([-71.215, -33.686]);
    expect(ana.getElement().tagName).toBe('BUTTON');
    expect(screen.getByRole('button', { name: 'Ana Demo, Nutrición' })).toHaveAttribute('title', 'Ana Demo, Nutrición');

    await userEvent.hover(ana.getElement());
    expect(onResaltar).toHaveBeenLastCalledWith(1);
    await userEvent.unhover(ana.getElement());
    expect(onResaltar).toHaveBeenLastCalledWith(null);
    await userEvent.click(screen.getByRole('button', { name: 'Otro profesional, Kinesiología' }));
    expect(onSeleccionar).toHaveBeenLastCalledWith(2);
  });

  test('con el teclado se llega a cada marcador con Tab y se elige con Enter (defecto 28)', async () => {
    const registro = simularMapLibre();
    const onSeleccionar = vi.fn();
    const onResaltar = vi.fn();
    render(mapa({ profesionales: [fichaProfesional(), otro], onSeleccionar, onResaltar }));
    await waitFor(() => expect(registro.marcadores).toHaveLength(2));
    await userEvent.tab();
    await userEvent.tab();
    expect(screen.getByRole('button', { name: 'Otro profesional, Kinesiología' })).toHaveFocus();
    expect(onResaltar).toHaveBeenLastCalledWith(2);
    await userEvent.keyboard('{Enter}');
    expect(onSeleccionar).toHaveBeenLastCalledWith(2);
  });

  test('marca el elegido y el resaltado sin volver a crear los marcadores, y anuncia la selección', async () => {
    const registro = simularMapLibre();
    const profesionales = [fichaProfesional(), otro];
    const { rerender } = render(mapa({ profesionales }));
    await waitFor(() => expect(registro.marcadores).toHaveLength(2));
    const [ana, segundo] = registro.marcadores.map((m) => m.getElement());
    expect(ana).toHaveAttribute('aria-pressed', 'false');

    rerender(mapa({ profesionales, seleccionadoId: 2, resaltadoId: 1 }));
    expect(segundo).toHaveClass('marcador-mapa--seleccionado');
    expect(segundo).toHaveAttribute('aria-pressed', 'true');
    expect(ana).toHaveClass('marcador-mapa--resaltado');
    expect(ana).not.toHaveClass('marcador-mapa--seleccionado');
    expect(screen.getByText('Seleccionado: Otro profesional, Kinesiología. Su detalle está bajo el mapa.')).toBeInTheDocument();
    expect(registro.marcadores).toHaveLength(2);

    rerender(mapa({ profesionales }));
    expect(segundo).not.toHaveClass('marcador-mapa--seleccionado');
    expect(ana).not.toHaveClass('marcador-mapa--resaltado');
  });

  test('elegido desde la lista, el mapa se desliza hasta su marcador', async () => {
    const registro = simularMapLibre();
    const profesionales = [fichaProfesional(), otro];
    const { rerender } = render(mapa({ profesionales }));
    await waitFor(() => expect(registro.marcadores).toHaveLength(2));
    expect(registro.easeTo).not.toHaveBeenCalled();
    rerender(mapa({ profesionales, seleccionadoId: 2, centrar: { id: 2, origen: 'lista' } }));
    expect(registro.easeTo).toHaveBeenCalledWith(expect.objectContaining({ center: [-70.66, -33.45], zoom: 13 }));
  });

  test('cambiar la página reutiliza el mapa y quita los marcadores anteriores', async () => {
    const registro = simularMapLibre();
    const { rerender } = render(mapa({ profesionales: [fichaProfesional()] }));
    await waitFor(() => expect(registro.marcadores).toHaveLength(1));
    const [primero] = registro.marcadores;
    rerender(mapa({ profesionales: [otro] }));
    await waitFor(() => expect(registro.marcadores).toHaveLength(2));
    expect(registro.mapas).toHaveLength(1);
    expect(primero.remove).toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Ana Demo, Nutrición' })).not.toBeInTheDocument();
  });

  test('usa el estilo de OpenFreeMap con el centro en [longitud, latitud]', async () => {
    const registro = simularMapLibre();
    render(mapa({ profesionales: [] }));
    await waitFor(() => expect(registro.mapas).toHaveLength(1));
    expect(registro.mapas[0].opciones).toMatchObject({ style: 'https://estilo.prueba/style.json', center: [-70.66, -33.45] });
  });

  test('el mapa se limita a Chile: no se aleja ni se mueve fuera del país ni repite el mundo', async () => {
    const registro = simularMapLibre();
    render(mapa({ profesionales: [] }));
    await waitFor(() => expect(registro.mapas).toHaveLength(1));
    expect(registro.mapas[0].opciones).toMatchObject({ maxBounds: [[-81, -56.5], [-65.5, -17]], renderWorldCopies: false });
  });

  test('una ubicación fuera de Chile no se dibuja ni aleja el encuadre, y se avisa', async () => {
    const registro = simularMapLibre();
    const juanito = fichaProfesional({ id: 14, nombre: 'juanito', ubicacionLat: -90, ubicacionLng: -90 });
    render(mapa({ profesionales: [fichaProfesional(), juanito] }));
    await waitFor(() => expect(registro.marcadores).toHaveLength(1));
    expect(registro.marcadores[0].getElement()).toHaveAttribute('title', expect.stringContaining('Ana Demo'));
    expect(registro.extendidos).toEqual([[-71.215, -33.686]]);
    // Con un solo punto en Chile se centra en él (no se encuadra con el punto erróneo).
    expect(registro.fitBounds).not.toHaveBeenCalled();
    expect(registro.centros.at(-1)).toEqual([-71.215, -33.686]);
    expect(screen.getByText(/juanito no aparece en el mapa porque su ubicación registrada está fuera de Chile/)).toBeInTheDocument();
  });

  test('oculto no dibuja marcadores ni encuadra; al mostrarse lo hace con su tamaño real', async () => {
    const registro = simularMapLibre();
    const dos = [fichaProfesional(), otro];
    const { rerender } = render(mapa({ profesionales: dos, visible: false }));
    await waitFor(() => expect(registro.mapas).toHaveLength(1));
    expect(registro.marcadores).toHaveLength(0);
    expect(registro.fitBounds).not.toHaveBeenCalled();
    rerender(mapa({ profesionales: dos, visible: true }));
    await waitFor(() => expect(registro.marcadores).toHaveLength(2));
    expect(registro.fitBounds).toHaveBeenCalledTimes(1);
  });

  test('no dibuja marcadores ni encuadra hasta que carga el estilo del mapa', async () => {
    const registro = simularMapLibre({ cargaManual: true });
    render(mapa({ profesionales: [fichaProfesional()] }));
    await waitFor(() => expect(registro.mapas).toHaveLength(1));
    expect(screen.getByText('Cargando mapa…')).toHaveAttribute('role', 'status');
    expect(registro.marcadores).toHaveLength(0);
    await act(async () => registro.cargarEstilo());
    await waitFor(() => expect(registro.marcadores).toHaveLength(1));
  });

  test('si falla la descarga del estilo lo avisa de inmediato y «Reintentar mapa» crea un mapa nuevo que sí carga (defecto 27)', async () => {
    const registro = simularMapLibre({ cargaManual: true });
    render(mapa({ profesionales: [fichaProfesional()] }));
    await waitFor(() => expect(registro.mapas).toHaveLength(1));

    // Una tesela que falla no es la caída del estilo: el mapa sigue cargando.
    act(() => registro.emitirError('https://tiles.prueba/1/2/3.pbf'));
    expect(screen.getByText('Cargando mapa…')).toBeInTheDocument();

    act(() => registro.emitirError('https://estilo.prueba/style.json'));
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo cargar el mapa. Revisa tu conexión y reintenta, o utiliza la lista.');
    expect(registro.mapas[0].remove).toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: 'Reintentar mapa' }));
    await waitFor(() => expect(registro.mapas).toHaveLength(2));
    await act(async () => registro.cargarEstilo());
    await waitFor(() => expect(registro.marcadores).toHaveLength(1));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  test('los controles del mapa están en español y cada marcador se anuncia con su profesional (defecto 29)', async () => {
    const registro = simularMapLibre();
    render(mapa({ profesionales: [fichaProfesional()] }));
    await waitFor(() => expect(registro.marcadores).toHaveLength(1));
    expect(registro.mapas[0].opciones.locale).toMatchObject({ 'NavigationControl.ZoomIn': 'Acercar', 'NavigationControl.ZoomOut': 'Alejar' });
    expect(registro.marcadores[0].getElement()).toHaveAttribute('aria-label', 'Ana Demo, Nutrición');
  });

  test('en una pestaña oculta el plazo de carga empieza a correr recién cuando la pestaña se ve (defecto 37)', async () => {
    const visibilidad = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    const temporizadores = vi.spyOn(globalThis, 'setTimeout');
    const plazos = () => temporizadores.mock.calls.filter(([, ms]) => ms === 15000);
    const registro = simularMapLibre({ cargaManual: true });
    render(mapa({ profesionales: [fichaProfesional()] }));
    await waitFor(() => expect(registro.mapas).toHaveLength(1));
    await act(async () => {});
    expect(plazos()).toHaveLength(0);

    visibilidad.mockReturnValue('visible');
    act(() => document.dispatchEvent(new Event('visibilitychange')));
    expect(plazos()).toHaveLength(1);
    await act(async () => registro.cargarEstilo());
    await waitFor(() => expect(registro.marcadores).toHaveLength(1));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  test('en un mapa angosto la atribución queda plegada en su botón al terminar de cargar', async () => {
    const registro = simularMapLibre();
    render(mapa({ profesionales: [fichaProfesional()] }));
    await waitFor(() => expect(registro.mapas).toHaveLength(1));
    // Como MapLibre: la atribución compacta parte abierta (jsdom mide 0 px de ancho, como un celular).
    const atribucion = document.createElement('details');
    atribucion.className = 'maplibregl-ctrl-attrib maplibregl-compact maplibregl-compact-show';
    atribucion.setAttribute('open', '');
    registro.mapas[0].opciones.container.append(atribucion);
    act(() => registro.terminarDibujo());
    expect(atribucion).not.toHaveClass('maplibregl-compact-show');
    expect(atribucion).not.toHaveAttribute('open');
    expect(atribucion).toHaveClass('maplibregl-compact');
  });

  test('al desmontar el componente libera el mapa', async () => {
    const registro = simularMapLibre();
    const { unmount } = render(mapa({ profesionales: [fichaProfesional()] }));
    await waitFor(() => expect(registro.marcadores).toHaveLength(1));
    unmount();
    expect(registro.marcadores[0].remove).toHaveBeenCalled();
    expect(registro.mapas[0].remove).toHaveBeenCalled();
  });
});

describe('Detalle bajo el mapa', () => {
  const detalle = (profesional, onCerrar = () => {}) => render(
    <MemoryRouter><DetalleEnMapa profesional={profesional} desde="/profesionales?q=nutri" onCerrar={onCerrar} /></MemoryRouter>,
  );

  test('muestra qué profesional es, si está verificado, dónde atiende, su próxima hora y cómo seguir', async () => {
    simularApi({ '/api/profesionales/1/disponibilidades': { horarios: [
      { id: 5, fecha: '2099-10-15', horaInicio: '09:00', horaFin: '10:00' }, { id: 6, fecha: '2099-10-16', horaInicio: '11:00', horaFin: '12:00' },
    ] } });
    const onCerrar = vi.fn();
    detalle(fichaProfesional({ distanciaKm: 2.3 }), onCerrar);
    const seccion = within(screen.getByRole('region', { name: 'Ana Demo' }));
    expect(seccion.getByRole('heading', { name: 'Ana Demo' })).toBeInTheDocument();
    expect(seccion.getByText('Nutrición · Presencial y online')).toBeInTheDocument();
    expect(seccion.getByRole('img', { name: 'Calificación 4,5 de 5, 12 reseñas' })).toBeInTheDocument();
    expect(seccion.getByText('2,3 km')).toBeInTheDocument();
    expect(seccion.getByText('Sin verificar')).toBeInTheDocument();
    expect(seccion.getByText(/Consulta Demo/).closest('span')).toHaveTextContent('Consulta Demo · Melipilla');
    expect(seccion.getByText('Atención nutricional')).toBeInTheDocument();
    expect(await seccion.findByText('Próxima hora: jueves 15 de octubre, 09:00 (2 horas disponibles)')).toBeInTheDocument();
    expect(seccion.getByRole('link', { name: 'Ver ficha y reservar' })).toHaveAttribute('href', '/profesionales/1');
    expect(seccion.getByRole('link', { name: /Cómo llegar/ })).toHaveAttribute('href', 'https://www.google.com/maps/search/?api=1&query=-33.686%2C-71.215');
    await userEvent.click(seccion.getByRole('button', { name: 'Cerrar detalle' }));
    expect(onCerrar).toHaveBeenCalled();
  });

  test('verificado y sin dirección: lo dice y pide confirmar la dirección exacta', async () => {
    simularApi({});
    detalle(fichaProfesional({ verificado: true, modalidad: 'presencial', comuna: 'Providencia', establecimiento: null }));
    expect(screen.getByText('Verificado por FitSearch')).toBeInTheDocument();
    expect(screen.getByText('Providencia. Dirección exacta por confirmar con el profesional.')).toBeInTheDocument();
    expect(await screen.findByText('Sin horas disponibles por ahora')).toBeInTheDocument();
  });

  test('usa la dirección que el profesional indicó en su ficha o dice que atiende solo online (SC-24)', async () => {
    simularApi({});
    const { unmount } = detalle(fichaProfesional({ modalidad: 'presencial', comuna: 'Providencia', direccion: 'Av. Providencia 1234, oficina 501',
      establecimiento: { nombre: 'Centro Uno', direccion: 'Otra calle 1' } }));
    // La dirección propia tiene prioridad sobre la del establecimiento y no repite la comuna que ya menciona.
    expect(screen.getByText('Av. Providencia 1234, oficina 501')).toBeInTheDocument();
    expect(screen.queryByText(/Centro Uno/)).not.toBeInTheDocument();
    await screen.findByText('Sin horas disponibles por ahora');
    unmount();
    detalle(fichaProfesional({ modalidad: 'online', comuna: 'Ñuñoa', direccion: null, establecimiento: null }));
    expect(screen.getByText('Ñuñoa. Atiende solo online.')).toBeInTheDocument();
    await screen.findByText('Sin horas disponibles por ahora');
  });
});

// Lista y mapa juntos en el buscador (SC-27).
describe('Lista y mapa juntos', () => {
  const javiera = fichaProfesional({ id: 2, nombre: 'Javiera Morales', especialidad: 'Kinesiología', modalidad: 'presencial', verificado: true,
    comuna: 'Providencia', establecimiento: null, ubicacionLat: -33.4263, ubicacionLng: -70.611 });
  // El detalle también titula con el nombre: la tarjeta se ubica por su enlace a la ficha.
  const tarjeta = (nombre) => screen.getByRole('link', { name: nombre }).closest('article');
  function abrirBuscador(ruta = '/profesionales', respuesta = listado([fichaProfesional(), javiera])) {
    sessionStorage.setItem('fitsearch_sesion', JSON.stringify(SESION));
    const registro = simularMapLibre();
    const fetch = simularApi({ '/api/profesionales/filtros': FILTROS, '/api/profesionales': respuesta });
    renderizarApp(ruta);
    return { registro, fetch };
  }
  const consultasListado = (fetch) => llamadasA(fetch, '/api/profesionales').filter(([url]) => /^\/api\/profesionales(\?|$)/.test(url));

  test('muestra la lista y el mapa a la vez, con un marcador por profesional de la página', async () => {
    const { registro } = abrirBuscador();
    expect(await screen.findByRole('heading', { name: 'Ana Demo' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Profesionales en el mapa' })).toBeInTheDocument();
    await waitFor(() => expect(registro.marcadores).toHaveLength(2));
    expect(screen.queryByRole('button', { name: 'Lista', exact: true })).not.toBeInTheDocument();
    expect(screen.getByText(/Elige un marcador o «Ver en el mapa»/)).toBeInTheDocument();
  });

  test('elegir un marcador muestra su detalle bajo el mapa y marca su tarjeta; «Cerrar detalle» lo quita', async () => {
    const { registro } = abrirBuscador();
    await waitFor(() => expect(registro.marcadores).toHaveLength(2));
    await userEvent.click(screen.getByRole('button', { name: 'Javiera Morales, Kinesiología' }));

    const seccion = within(screen.getByRole('region', { name: 'Javiera Morales' }));
    expect(seccion.getByText('Kinesiología · Presencial')).toBeInTheDocument();
    expect(seccion.getByText('Verificado por FitSearch')).toBeInTheDocument();
    expect(seccion.getByRole('link', { name: 'Ver ficha y reservar' })).toHaveAttribute('href', '/profesionales/2');
    expect(tarjeta('Javiera Morales')).toHaveClass('tarjeta-profesional--seleccionada');
    expect(within(tarjeta('Javiera Morales')).getByRole('button', { name: 'Ver en el mapa a Javiera Morales' })).toHaveAttribute('aria-pressed', 'true');
    expect(registro.marcadores[1].getElement()).toHaveClass('marcador-mapa--seleccionado');
    // Elegido en el mapa, el mapa no se mueve: ya se ve el marcador.
    expect(registro.easeTo).not.toHaveBeenCalled();

    await userEvent.click(seccion.getByRole('button', { name: 'Cerrar detalle' }));
    expect(screen.queryByRole('region', { name: 'Javiera Morales' })).not.toBeInTheDocument();
    expect(tarjeta('Javiera Morales')).not.toHaveClass('tarjeta-profesional--seleccionada');
  });

  test('«Ver en el mapa» en una tarjeta elige al profesional y lleva el mapa a su marcador; otra vez lo deselecciona', async () => {
    const { registro } = abrirBuscador();
    await waitFor(() => expect(registro.marcadores).toHaveLength(2));
    const boton = screen.getByRole('button', { name: 'Ver en el mapa a Ana Demo' });
    await userEvent.click(boton);
    expect(boton).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('region', { name: 'Ana Demo' })).toBeInTheDocument();
    expect(registro.marcadores[0].getElement()).toHaveAttribute('aria-pressed', 'true');
    expect(registro.easeTo).toHaveBeenCalledWith(expect.objectContaining({ center: [-71.215, -33.686] }));
    await userEvent.click(boton);
    expect(boton).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByRole('region', { name: 'Ana Demo' })).not.toBeInTheDocument();
  });

  test('pasar por una tarjeta resalta su marcador y pasar por un marcador resalta su tarjeta', async () => {
    const { registro } = abrirBuscador();
    await waitFor(() => expect(registro.marcadores).toHaveLength(2));
    await userEvent.hover(tarjeta('Ana Demo'));
    expect(registro.marcadores[0].getElement()).toHaveClass('marcador-mapa--resaltado');
    await userEvent.unhover(tarjeta('Ana Demo'));
    expect(registro.marcadores[0].getElement()).not.toHaveClass('marcador-mapa--resaltado');
    await userEvent.hover(registro.marcadores[1].getElement());
    expect(tarjeta('Javiera Morales')).toHaveClass('tarjeta-profesional--resaltada');
  });

  test('cambiar de página descarta la selección', async () => {
    sessionStorage.setItem('fitsearch_sesion', JSON.stringify(SESION));
    const registro = simularMapLibre();
    simularApi({ '/api/profesionales/filtros': FILTROS,
      '/api/profesionales': (url) => [200, url.includes('pagina=2') ? listado([javiera], { pagina: 2, total: 13 }) : listado([fichaProfesional()], { total: 13 })] });
    renderizarApp('/profesionales');
    await waitFor(() => expect(registro.marcadores).toHaveLength(1));
    await userEvent.click(screen.getByRole('button', { name: 'Ver en el mapa a Ana Demo' }));
    expect(screen.getByRole('region', { name: 'Ana Demo' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    expect(await screen.findByRole('heading', { name: 'Javiera Morales' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: /Ana Demo|Javiera Morales/ })).not.toBeInTheDocument();
  });

  test('ocultar y mostrar el mapa conserva filtros y página sin repetir la búsqueda; «Ver en el mapa» lo vuelve a mostrar', async () => {
    const { registro, fetch } = abrirBuscador('/profesionales?q=nutri&comuna=Melipilla&pagina=2',
      listado([fichaProfesional()], { pagina: 2, total: 30 }));
    await waitFor(() => expect(registro.marcadores).toHaveLength(1));
    const busquedas = consultasListado(fetch).length;

    await userEvent.click(screen.getByRole('button', { name: 'Ocultar mapa' }));
    expect(screen.queryByRole('region', { name: 'Profesionales en el mapa' })).not.toBeInTheDocument();
    expect(screen.getByText('Página 2 de 3')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Quitar filtro: Melipilla' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Ver en el mapa a Ana Demo' }));
    expect(screen.getByRole('region', { name: 'Profesionales en el mapa' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Ana Demo' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ocultar mapa' })).toBeInTheDocument();
    expect(consultasListado(fetch)).toHaveLength(busquedas);
    // El mapa se reutiliza: no se descarga ni se crea de nuevo.
    expect(registro.mapas).toHaveLength(1);
  });

  test('con el mapa oculto en la URL, solo se ve la lista y limpiar los filtros no lo vuelve a mostrar', async () => {
    const { registro } = abrirBuscador('/profesionales?mapa=oculto&comuna=Melipilla');
    expect(await screen.findByRole('heading', { name: 'Ana Demo' })).toBeInTheDocument();
    expect(cargarMapLibre).not.toHaveBeenCalled();
    expect(registro.mapas).toHaveLength(0);
    await userEvent.click(screen.getAllByRole('button', { name: 'Limpiar filtros' })[0]);
    expect(screen.getByRole('button', { name: 'Mostrar mapa' })).toBeInTheDocument();
  });

  test('una tarjeta sin ubicación en Chile no ofrece «Ver en el mapa»', async () => {
    abrirBuscador('/profesionales', listado([fichaProfesional(), fichaProfesional({ id: 14, nombre: 'juanito', ubicacionLat: -90, ubicacionLng: -90 })]));
    expect(await screen.findByRole('heading', { name: 'juanito' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ver en el mapa a Ana Demo' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ver en el mapa a juanito' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'juanito' })).toHaveAttribute('href', '/profesionales/14');
  });

  test('con 0 resultados solo se muestra el estado vacío, sin mapa', async () => {
    abrirBuscador('/profesionales', listado([]));
    expect(await screen.findByText('Aún no hay profesionales para mostrar')).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Profesionales en el mapa' })).not.toBeInTheDocument();
  });

  test('si el mapa no carga, la lista sigue disponible con sus enlaces a las fichas', async () => {
    sessionStorage.setItem('fitsearch_sesion', JSON.stringify(SESION));
    fallarProveedor();
    simularApi({ '/api/profesionales/filtros': FILTROS, '/api/profesionales': listado([fichaProfesional()]) });
    renderizarApp('/profesionales');
    expect(await screen.findByRole('alert')).toHaveTextContent('Mapa no disponible');
    expect(screen.getByRole('link', { name: 'Ana Demo' })).toHaveAttribute('href', '/profesionales/1');
  });
});

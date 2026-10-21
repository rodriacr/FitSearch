import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, expect, test, vi } from 'vitest';
import { cargarMapLibre } from '../../services/mapas.js';
import MapaProfesionales from './MapaProfesionales.jsx';
import { fichaProfesional, listado, FILTROS, renderizarApp, SESION, simularApi } from '../../tests/utilidades.jsx';
vi.mock('../../services/mapas.js', () => ({ cargarMapLibre: vi.fn(), ESTILO_MAPA: 'https://estilo.prueba/style.json' }));
beforeEach(() => {
  cargarMapLibre.mockReset();
  // Las ventanas abiertas se agregan al documento (como en MapLibre): se limpian entre pruebas.
  document.querySelectorAll('.ventana-mapa').forEach((nodo) => nodo.remove());
});

// MapLibre simulado: registra mapas, marcadores y ventanas para revisar lo que dibuja el componente.
// Con cargaManual el estilo no termina de cargar hasta llamar registro.cargarEstilo(); registro.emitirError(url) simula
// el evento error de MapLibre (por ejemplo, la descarga del estilo que falla).
function simularMapLibre({ cargaManual = false } = {}) {
  const registro = {
    mapas: [], marcadores: [], ventanas: [], extendidos: [], centros: [], fitBounds: vi.fn(), cargarEstilo: () => {},
    emitirError: (url) => [...registro.mapas.at(-1).oyentesError].forEach((cb) => cb({ error: { url, status: 0 } })),
  };
  class Map {
    constructor(opciones) { this.opciones = opciones; this.remove = vi.fn(); this.oyentesError = new Set(); registro.mapas.push(this); }
    once(evento, cb) {
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
    fitBounds(...args) { registro.fitBounds(...args); }
  }
  class LngLatBounds { extend(punto) { registro.extendidos.push(punto); } }
  class NavigationControl {}
  // Como en MapLibre, el clic en el marcador abre su ventana (y la ventana avisa con el evento open).
  class Marker {
    constructor() {
      this.elemento = document.createElement('div'); this.remove = vi.fn(); registro.marcadores.push(this);
      this.elemento.addEventListener('click', () => this.ventana?.abrir());
    }
    setLngLat() { return this; }
    setPopup(ventana) { this.ventana = ventana; return this; }
    addTo() { return this; }
    getElement() { return this.elemento; }
  }
  class Popup {
    constructor(opciones) {
      this.opciones = opciones; this.oyentes = new Set(); registro.ventanas.push(this);
      this.remove = vi.fn(() => this.contenido?.remove());
    }
    on(evento, cb) { if (evento === 'open') this.oyentes.add(cb); return this; }
    off(evento, cb) { this.oyentes.delete(cb); return this; }
    abrir() { document.body.append(this.contenido); this.oyentes.forEach((cb) => cb()); }
    setDOMContent(contenido) { this.contenido = contenido; return this; }
    setLngLat() { return this; }
    addTo() { return this; }
  }
  cargarMapLibre.mockResolvedValue({ Map, LngLatBounds, NavigationControl, Marker, Popup });
  return registro;
}
const fallarProveedor = () => cargarMapLibre.mockResolvedValue({ Map: class { constructor() { throw new Error('Mapa no disponible'); } } });

test('cambiar la página reutiliza el mapa y limpia selección, ventanas y marcadores anteriores', async () => {
  simularApi({});
  const registro = simularMapLibre();
  const { rerender } = render(<MemoryRouter><MapaProfesionales profesionales={[fichaProfesional()]} /></MemoryRouter>);
  await waitFor(() => expect(registro.marcadores).toHaveLength(1));
  const [primero] = registro.marcadores;
  expect(primero.getElement()).toHaveAttribute('title', expect.stringContaining('Ana Demo'));
  act(() => primero.getElement().click());
  expect(screen.getByRole('link', { name: 'Ver ficha de Ana Demo' })).toBeInTheDocument();
  rerender(<MemoryRouter><MapaProfesionales profesionales={[fichaProfesional({ id: 2, nombre: 'Otro profesional' })]} /></MemoryRouter>);
  await waitFor(() => expect(registro.marcadores).toHaveLength(2));
  expect(registro.mapas).toHaveLength(1);
  expect(screen.queryByRole('link', { name: 'Ver ficha de Ana Demo' })).not.toBeInTheDocument();
  expect(primero.remove).toHaveBeenCalled();
  expect(registro.ventanas[0].remove).toHaveBeenCalled();
});
test('al abrir un marcador muestra qué profesional es, si está verificado, dónde atiende y su próxima hora', async () => {
  simularApi({
    '/api/profesionales/1/disponibilidades': { horarios: [
      { id: 5, fecha: '2099-10-15', horaInicio: '09:00', horaFin: '10:00' }, { id: 6, fecha: '2099-10-16', horaInicio: '11:00', horaFin: '12:00' },
    ] },
    '/api/profesionales/2/disponibilidades': { horarios: [] },
  });
  const registro = simularMapLibre();
  const javiera = fichaProfesional({ id: 2, nombre: 'Javiera Morales', especialidad: 'Kinesiología', modalidad: 'presencial', verificado: true,
    comuna: 'Providencia', establecimiento: null, ubicacionLat: -33.4263, ubicacionLng: -70.611 });
  render(<MemoryRouter><MapaProfesionales profesionales={[fichaProfesional(), javiera]} desde="/profesionales?vista=mapa" /></MemoryRouter>);
  await waitFor(() => expect(registro.marcadores).toHaveLength(2));
  expect(registro.ventanas[0].opciones).toMatchObject({ maxWidth: '18rem' });

  act(() => registro.marcadores[0].getElement().click());
  const ana = within(registro.ventanas[0].contenido);
  expect(ana.getByText('Ana Demo')).toBeInTheDocument();
  expect(ana.getByText('Nutrición · Presencial y online')).toBeInTheDocument();
  expect(ana.getByText('Sin verificar')).toBeInTheDocument();
  expect(ana.getByText(/Consulta Demo/).closest('span')).toHaveTextContent('Consulta Demo · Melipilla');
  expect(await ana.findByText('Próxima hora: jueves 15 de octubre, 09:00 (2 horas disponibles)')).toBeInTheDocument();
  expect(ana.getByRole('link', { name: 'Ver ficha y reservar' })).toHaveAttribute('href', '/profesionales/1');
  expect(ana.getByRole('link', { name: /Cómo llegar/ })).toHaveAttribute('href', 'https://www.google.com/maps/search/?api=1&query=-33.686%2C-71.215');

  act(() => registro.marcadores[1].getElement().click());
  expect(registro.ventanas[0].remove).toHaveBeenCalled();
  const segunda = within(registro.ventanas[1].contenido);
  expect(segunda.getByText('Kinesiología · Presencial')).toBeInTheDocument();
  expect(segunda.getByText('Verificado por FitSearch')).toBeInTheDocument();
  expect(segunda.getByText('Providencia. Dirección exacta por confirmar con el profesional.')).toBeInTheDocument();
  expect(await segunda.findByText('Sin horas disponibles por ahora')).toBeInTheDocument();
});
test('la ventana muestra la dirección que el profesional indicó en su ficha o que atiende solo online (SC-24)', async () => {
  simularApi({ '/api/profesionales/2/disponibilidades': { horarios: [] }, '/api/profesionales/3/disponibilidades': { horarios: [] } });
  const registro = simularMapLibre();
  const presencial = fichaProfesional({ id: 2, nombre: 'Javiera Morales', modalidad: 'presencial', comuna: 'Providencia',
    direccion: 'Av. Providencia 1234, oficina 501', establecimiento: { nombre: 'Centro Uno', direccion: 'Otra calle 1' } });
  const online = fichaProfesional({ id: 3, nombre: 'Pedro Online', modalidad: 'online', comuna: 'Ñuñoa', direccion: null, establecimiento: null,
    ubicacionLat: -33.45, ubicacionLng: -70.6 });
  render(<MemoryRouter><MapaProfesionales profesionales={[presencial, online]} /></MemoryRouter>);
  await waitFor(() => expect(registro.marcadores).toHaveLength(2));

  act(() => registro.marcadores[0].getElement().click());
  const javiera = within(registro.ventanas[0].contenido);
  // La dirección propia tiene prioridad sobre la del establecimiento y no repite la comuna que ya menciona.
  expect(javiera.getByText('Av. Providencia 1234, oficina 501')).toBeInTheDocument();
  expect(javiera.queryByText(/Centro Uno/)).not.toBeInTheDocument();
  expect(await javiera.findByText('Sin horas disponibles por ahora')).toBeInTheDocument();

  act(() => registro.marcadores[1].getElement().click());
  const pedro = within(registro.ventanas[1].contenido);
  expect(pedro.getByText('Ñuñoa. Atiende solo online.')).toBeInTheDocument();
  expect(await pedro.findByText('Sin horas disponibles por ahora')).toBeInTheDocument();
});
test('con el teclado la ventana se abre sin clic y también registra la selección y cierra las demás (defecto 28)', async () => {
  simularApi({});
  const registro = simularMapLibre();
  render(<MemoryRouter><MapaProfesionales profesionales={[fichaProfesional(), fichaProfesional({ id: 2, nombre: 'Otro profesional' })]} /></MemoryRouter>);
  await waitFor(() => expect(registro.marcadores).toHaveLength(2));
  act(() => registro.ventanas[0].abrir());
  act(() => registro.ventanas[1].abrir());
  expect(registro.ventanas[0].remove).toHaveBeenCalled();
  expect(screen.getByRole('link', { name: 'Ver ficha de Otro profesional' })).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'Ver ficha de Ana Demo' })).not.toBeInTheDocument();
});
test('usa el estilo de OpenFreeMap con el centro en [longitud, latitud]', async () => {
  const registro = simularMapLibre();
  render(<MemoryRouter><MapaProfesionales profesionales={[]} /></MemoryRouter>);
  await waitFor(() => expect(registro.mapas).toHaveLength(1));
  expect(registro.mapas[0].opciones).toMatchObject({ style: 'https://estilo.prueba/style.json', center: [-70.66, -33.45] });
});
test('el mapa se limita a Chile: no se aleja ni se mueve fuera del país ni repite el mundo', async () => {
  const registro = simularMapLibre();
  render(<MemoryRouter><MapaProfesionales profesionales={[]} /></MemoryRouter>);
  await waitFor(() => expect(registro.mapas).toHaveLength(1));
  expect(registro.mapas[0].opciones).toMatchObject({ maxBounds: [[-81, -56.5], [-65.5, -17]], renderWorldCopies: false });
});
test('una ubicación fuera de Chile no se dibuja ni aleja el encuadre, y se avisa sin quitarla de la lista', async () => {
  const registro = simularMapLibre();
  const juanito = fichaProfesional({ id: 14, nombre: 'juanito', ubicacionLat: -90, ubicacionLng: -90 });
  render(<MemoryRouter><MapaProfesionales profesionales={[fichaProfesional(), juanito]} /></MemoryRouter>);
  await waitFor(() => expect(registro.marcadores).toHaveLength(1));
  expect(registro.marcadores[0].getElement()).toHaveAttribute('title', expect.stringContaining('Ana Demo'));
  expect(registro.extendidos).toEqual([[-71.215, -33.686]]);
  // Con un solo punto en Chile se centra en él (no se encuadra con el punto erróneo).
  expect(registro.fitBounds).not.toHaveBeenCalled();
  expect(registro.centros.at(-1)).toEqual([-71.215, -33.686]);
  expect(screen.getByText(/juanito no aparece en el mapa porque su ubicación registrada está fuera de Chile/)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'juanito' })).toHaveAttribute('href', '/profesionales/14');
});
test('oculto no dibuja marcadores ni encuadra; al mostrarse lo hace con su tamaño real', async () => {
  const registro = simularMapLibre();
  const dos = [fichaProfesional(), fichaProfesional({ id: 2, nombre: 'Otro profesional', ubicacionLat: -33.45, ubicacionLng: -70.66 })];
  const { rerender } = render(<MemoryRouter><MapaProfesionales profesionales={dos} visible={false} /></MemoryRouter>);
  await waitFor(() => expect(registro.mapas).toHaveLength(1));
  expect(registro.marcadores).toHaveLength(0);
  expect(registro.fitBounds).not.toHaveBeenCalled();
  rerender(<MemoryRouter><MapaProfesionales profesionales={dos} visible /></MemoryRouter>);
  await waitFor(() => expect(registro.marcadores).toHaveLength(2));
  expect(registro.fitBounds).toHaveBeenCalledTimes(1);
});
test('no dibuja marcadores ni encuadra hasta que carga el estilo del mapa', async () => {
  const registro = simularMapLibre({ cargaManual: true });
  render(<MemoryRouter><MapaProfesionales profesionales={[fichaProfesional()]} /></MemoryRouter>);
  await waitFor(() => expect(registro.mapas).toHaveLength(1));
  expect(screen.getByRole('status')).toHaveTextContent('Cargando mapa');
  expect(registro.marcadores).toHaveLength(0);
  await act(async () => registro.cargarEstilo());
  await waitFor(() => expect(registro.marcadores).toHaveLength(1));
  expect(registro.marcadores[0].ventana).toBe(registro.ventanas[0]);
});
test('si falla la descarga del estilo lo avisa de inmediato y «Reintentar mapa» crea un mapa nuevo que sí carga (defecto 27)', async () => {
  const registro = simularMapLibre({ cargaManual: true });
  render(<MemoryRouter><MapaProfesionales profesionales={[fichaProfesional()]} /></MemoryRouter>);
  await waitFor(() => expect(registro.mapas).toHaveLength(1));

  // Una tesela que falla no es la caída del estilo: el mapa sigue cargando.
  act(() => registro.emitirError('https://tiles.prueba/1/2/3.pbf'));
  expect(screen.getByRole('status')).toHaveTextContent('Cargando mapa');

  act(() => registro.emitirError('https://estilo.prueba/style.json'));
  expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo cargar el mapa. Revisa tu conexión y reintenta, o utiliza la lista.');
  expect(registro.mapas[0].remove).toHaveBeenCalled();
  expect(screen.getByRole('link', { name: 'Ana Demo' })).toHaveAttribute('href', '/profesionales/1');

  await userEvent.click(screen.getByRole('button', { name: 'Reintentar mapa' }));
  await waitFor(() => expect(registro.mapas).toHaveLength(2));
  await act(async () => registro.cargarEstilo());
  await waitFor(() => expect(registro.marcadores).toHaveLength(1));
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});
test('los controles del mapa están en español y cada marcador se anuncia con su profesional (defecto 29)', async () => {
  const registro = simularMapLibre();
  render(<MemoryRouter><MapaProfesionales profesionales={[fichaProfesional()]} /></MemoryRouter>);
  await waitFor(() => expect(registro.marcadores).toHaveLength(1));
  expect(registro.mapas[0].opciones.locale).toMatchObject({
    'NavigationControl.ZoomIn': 'Acercar', 'NavigationControl.ZoomOut': 'Alejar', 'Popup.Close': 'Cerrar ventana',
  });
  expect(registro.marcadores[0].getElement()).toHaveAttribute('aria-label', 'Ana Demo, Nutrición');
});
test('al desmontar el componente libera el mapa', async () => {
  const registro = simularMapLibre();
  const { unmount } = render(<MemoryRouter><MapaProfesionales profesionales={[fichaProfesional()]} /></MemoryRouter>);
  await waitFor(() => expect(registro.marcadores).toHaveLength(1));
  unmount();
  expect(registro.marcadores[0].remove).toHaveBeenCalled();
  expect(registro.mapas[0].remove).toHaveBeenCalled();
});
test('con 0 resultados en la vista Mapa solo se muestra el estado vacío', async () => {
  sessionStorage.setItem('fitsearch_sesion', JSON.stringify(SESION));
  fallarProveedor();
  simularApi({ '/api/profesionales/filtros': FILTROS, '/api/profesionales': listado([]) });
  renderizarApp('/profesionales?vista=mapa');
  expect(await screen.findByText('Aún no hay profesionales para mostrar')).toBeInTheDocument();
  expect(screen.queryByRole('region', { name: 'Profesionales en el mapa' })).not.toBeInTheDocument();
});
test('una falla del proveedor conserva los enlaces accesibles a las fichas', async () => {
  fallarProveedor();
  render(<MemoryRouter><MapaProfesionales profesionales={[fichaProfesional()]} desde="/profesionales?q=nutri" /></MemoryRouter>);
  expect(await screen.findByRole('alert')).toHaveTextContent('Mapa no disponible');
  expect(screen.getByRole('link', { name: 'Ana Demo' })).toHaveAttribute('href', '/profesionales/1');
});
test('alternar lista y mapa conserva filtros y la página actual', async () => {
  sessionStorage.setItem('fitsearch_sesion', JSON.stringify(SESION));
  fallarProveedor();
  const fetch = simularApi({ '/api/profesionales/filtros': FILTROS, '/api/profesionales': listado([fichaProfesional()],{pagina:2,total:30}) });
  renderizarApp('/profesionales?q=nutri&comuna=Melipilla&pagina=2');
  await screen.findByRole('heading', { name: 'Ana Demo' });
  const llamadasAntes=fetch.mock.calls.length;
  await userEvent.click(screen.getByRole('button', { name: 'Mapa', exact: true }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Mapa no disponible');
  expect(screen.getByText('Página 2 de 3')).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button',{name:'Lista',exact:true}));
  expect(await screen.findByRole('heading',{name:'Ana Demo'})).toBeInTheDocument();
  expect(fetch.mock.calls.length).toBe(llamadasAntes);
});

test('crea marcadores de los resultados y permite abrir la ficha seleccionada', async () => {
  const registro = simularMapLibre();
  render(<MemoryRouter><MapaProfesionales profesionales={[fichaProfesional()]} desde="/profesionales?q=nutri" /></MemoryRouter>);
  await screen.findByRole('link', { name: 'Ana Demo' });
  await waitFor(() => expect(registro.marcadores).toHaveLength(1));
  act(() => registro.marcadores[0].getElement().click());
  expect(screen.getByRole('link', { name: 'Ver ficha de Ana Demo' })).toHaveAttribute('href', '/profesionales/1');
});

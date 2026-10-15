import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, expect, test, vi } from 'vitest';
import { cargarMapLibre } from '../../services/mapas.js';
import MapaProfesionales from './MapaProfesionales.jsx';
import { fichaProfesional, listado, FILTROS, renderizarApp, SESION, simularApi } from '../../tests/utilidades.jsx';
vi.mock('../../services/mapas.js', () => ({ cargarMapLibre: vi.fn(), ESTILO_MAPA: 'https://estilo.prueba/style.json' }));
beforeEach(() => cargarMapLibre.mockReset());

// MapLibre simulado: registra mapas, marcadores y ventanas para revisar lo que dibuja el componente.
// Con cargaManual el estilo no termina de cargar hasta llamar registro.cargarEstilo().
function simularMapLibre({ cargaManual = false } = {}) {
  const registro = { mapas: [], marcadores: [], ventanas: [], fitBounds: vi.fn(), cargarEstilo: () => {} };
  class Map {
    constructor(opciones) { this.opciones = opciones; this.remove = vi.fn(); registro.mapas.push(this); }
    once(evento, cb) {
      if (evento !== 'load') return;
      if (cargaManual) registro.cargarEstilo = cb;
      else queueMicrotask(cb);
    }
    addControl() {}
    resize() {}
    setCenter() {}
    setZoom() {}
    fitBounds(...args) { registro.fitBounds(...args); }
  }
  class LngLatBounds { extend() {} }
  class NavigationControl {}
  class Marker {
    constructor() { this.elemento = document.createElement('div'); this.remove = vi.fn(); registro.marcadores.push(this); }
    setLngLat() { return this; }
    setPopup(ventana) { this.ventana = ventana; return this; }
    addTo() { return this; }
    getElement() { return this.elemento; }
  }
  class Popup {
    constructor() { this.remove = vi.fn(); registro.ventanas.push(this); }
    setDOMContent() { return this; }
    setLngLat() { return this; }
    addTo() { return this; }
  }
  cargarMapLibre.mockResolvedValue({ Map, LngLatBounds, NavigationControl, Marker, Popup });
  return registro;
}
const fallarProveedor = () => cargarMapLibre.mockRejectedValue(new Error('Mapa no disponible'));

test('cambiar la página reutiliza el mapa y limpia selección, ventanas y marcadores anteriores', async () => {
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
test('usa el estilo de OpenFreeMap con el centro en [longitud, latitud]', async () => {
  const registro = simularMapLibre();
  render(<MemoryRouter><MapaProfesionales profesionales={[]} /></MemoryRouter>);
  await waitFor(() => expect(registro.mapas).toHaveLength(1));
  expect(registro.mapas[0].opciones).toMatchObject({ style: 'https://estilo.prueba/style.json', center: [-70.66, -33.45] });
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

import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, expect, test, vi } from 'vitest';
import { cargarGoogleMaps } from '../../services/mapas.js';
import MapaProfesionales from './MapaProfesionales.jsx';
import { fichaProfesional, listado, FILTROS, renderizarApp, SESION, simularApi } from '../../tests/utilidades.jsx';
vi.mock('../../services/mapas.js', () => ({ cargarGoogleMaps: vi.fn() }));
beforeEach(() => cargarGoogleMaps.mockReset());
test('una falla del proveedor conserva los enlaces accesibles a las fichas', async () => {
  cargarGoogleMaps.mockResolvedValue({ importLibrary: () => { throw new Error('Mapa no disponible'); } });
  render(<MemoryRouter><MapaProfesionales profesionales={[fichaProfesional()]} desde="/profesionales?q=nutri" /></MemoryRouter>);
  expect(await screen.findByRole('alert')).toHaveTextContent('Mapa no disponible');
  expect(screen.getByRole('link', { name: 'Ana Demo' })).toHaveAttribute('href', '/profesionales/1');
});
test('alternar lista y mapa conserva filtros y la página actual', async () => {
  sessionStorage.setItem('fitsearch_sesion', JSON.stringify(SESION));
  cargarGoogleMaps.mockResolvedValue({ importLibrary: () => { throw new Error('Mapa no disponible'); } });
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
  const callbacks = [];
  class Map { setCenter() {} setZoom() {} fitBounds() {} }
  class LatLngBounds { extend() {} }
  class InfoWindow { open() {} close() {} }
  class AdvancedMarkerElement {
    constructor(datos) { this.datos = datos; }
    addListener(_tipo, cb) { callbacks.push(cb); return { remove() {} }; }
  }
  cargarGoogleMaps.mockResolvedValue({ LatLngBounds, InfoWindow, importLibrary: async (nombre) => nombre === 'maps' ? { Map } : { AdvancedMarkerElement } });
  render(<MemoryRouter><MapaProfesionales profesionales={[fichaProfesional()]} desde="/profesionales?q=nutri" /></MemoryRouter>);
  await screen.findByRole('link', { name: 'Ana Demo' });
  await waitFor(() => expect(callbacks).toHaveLength(1));
  act(() => callbacks[0]());
  expect(screen.getByRole('link', { name: 'Ver ficha de Ana Demo' })).toHaveAttribute('href', '/profesionales/1');
});

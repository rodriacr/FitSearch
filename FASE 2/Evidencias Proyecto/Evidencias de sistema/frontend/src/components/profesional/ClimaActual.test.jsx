import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import ClimaActual from './ClimaActual.jsx';
import { simularApi, simularUbicacion } from '../../tests/utilidades.jsx';

const clima = { lugar: 'San Antonio', temperatura: 18, estado: 'despejado', descripcion: 'Despejado', esDeDia: true, fuente: 'Open-Meteo' };
test('envía la posición reciente aproximada en el cuerpo, nunca la comuna del perfil', async () => {
  const geo = simularUbicacion({ lat: -33.593712, lng: -71.621791 });
  const fetch = simularApi({ '/api/clima': clima });
  render(<ClimaActual />);
  expect(await screen.findByRole('group', { name: 'Clima en San Antonio: 18 grados, Despejado' })).toBeInTheDocument();
  const [url, opciones] = fetch.mock.calls.find(([url]) => url === '/api/clima');
  expect(url).not.toContain('?');
  expect(opciones.method).toBe('POST');
  expect(JSON.parse(opciones.body)).toEqual({ lat: -33.59, lng: -71.62 });
  expect(geo.mock.calls[0][2]).toMatchObject({ maximumAge: 60000, timeout: 10000 });
});
test('si no hay permiso, no consulta el clima de otra ciudad y explica cómo activarlo', async () => {
  simularUbicacion({ error: 1 });
  const fetch = simularApi({});
  render(<ClimaActual />);
  expect(await screen.findByText(/Permite la ubicación en tu navegador/)).toBeInTheDocument();
  expect(fetch).not.toHaveBeenCalled();
  expect(screen.queryByText('Santiago')).not.toBeInTheDocument();
});
test('actualizar vuelve a ubicar y cambia de Santiago a San Antonio sin reutilizar coordenadas anteriores', async () => {
  const geo = simularUbicacion({ lat: -33.45, lng: -70.67 });
  simularApi({ '/api/clima': (_url, opciones) => [200, { ...clima, lugar: JSON.parse(opciones.body).lng === -70.67 ? 'Santiago' : 'San Antonio' }] });
  render(<ClimaActual />);
  await screen.findByRole('group', { name: /Clima en Santiago:/ });
  geo.mockImplementation((exito) => exito({ coords: { latitude: -33.5937, longitude: -71.6217 } }));
  await userEvent.click(screen.getByRole('button', { name: 'Actualizar clima de mi ubicación' }));
  expect(await screen.findByRole('group', { name: /Clima en San Antonio:/ })).toBeInTheDocument();
  expect(geo).toHaveBeenCalledTimes(2);
});
test('si la ubicación no está disponible puede reintentar sin inventar una temperatura', async () => {
  simularUbicacion({ error: 2 });
  render(<ClimaActual />);
  expect(await screen.findByText(/No pudimos obtener tu ubicación actual/)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Reintentar ubicación' })).toBeInTheDocument();
  expect(screen.queryByText(/°C/)).not.toBeInTheDocument();
});
test('el reloj del clima se limpia al desmontar', async () => {
  simularUbicacion({ lat: -33.59, lng: -71.62 });
  simularApi({ '/api/clima': clima });
  const quitar = vi.spyOn(window, 'removeEventListener');
  const ui = render(<ClimaActual />);
  await waitFor(() => expect(screen.getByText('San Antonio')).toBeInTheDocument());
  ui.unmount();
  expect(quitar).toHaveBeenCalledWith('focus', expect.any(Function));
});

import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { SesionProvider } from '../../context/SesionContext.jsx';
import { renderizarApp, SESION_PROFESIONAL, simularApi } from '../../tests/utilidades.jsx';
import ListadoReservas from '../ListadoReservas.jsx';

const reserva = (id, nombre, fecha, estado = 'confirmada') => ({ id, usuario: { id, nombre }, profesional: { id: 3, nombre: 'Matías' }, horario: { id: id + 100, fecha, horaInicio: '11:00', horaFin: '12:00' }, estado, mensaje: 'Seguimiento', modalidad: 'presencial' });
const filas = [reserva(1, 'Ana', '2099-10-15', 'pendiente'), reserva(2, 'Bruno', '2099-10-20'), reserva(3, 'Carla', '2099-10-05'), reserva(4, 'Diego', '2099-10-01', 'pendiente'), reserva(5, 'Elena', '2099-10-25', 'cancelada')];
const nombres = () => screen.queryAllByRole('article').map((r) => within(r).getByRole('heading').textContent);
beforeEach(() => {
  sessionStorage.setItem('fitsearch_sesion', JSON.stringify(SESION_PROFESIONAL));
  vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2099-10-12T13:00:00Z'));
});
afterEach(() => vi.useRealTimers());
function Direccion() {
  const lugar = useLocation(); const ir = useNavigate();
  return <><output aria-label="Dirección de prueba">{lugar.search}</output><button onClick={() => ir(-1)}>Volver de prueba</button></>;
}
function montar(url = '/profesional/agenda?vista=reservas', datos = filas) {
  const fetch = simularApi({ '/api/reservas': { reservas: datos } });
  render(<MemoryRouter initialEntries={[url]}><SesionProvider><Direccion /><ListadoReservas profesional /></SesionProvider></MemoryRouter>);
  return fetch;
}
test('Todas, Por confirmar, Próximas e Historial tienen alcances y contadores distintos', async () => {
  montar();
  await screen.findByRole('search', { name: 'Buscar reservas' });
  expect(nombres()).toHaveLength(5);
  expect(screen.getByRole('button', { name: 'Todas' })).toHaveTextContent('5');
  expect(screen.getByRole('button', { name: 'Por confirmar' })).toHaveTextContent('1');
  expect(screen.getByRole('button', { name: 'Próximas' })).toHaveTextContent('2');
  expect(screen.getByRole('button', { name: 'Historial' })).toHaveTextContent('3');
  await userEvent.click(screen.getByRole('button', { name: 'Por confirmar' })); expect(nombres()).toEqual(['Ana']);
  await userEvent.click(screen.getByRole('button', { name: 'Próximas' })); expect(nombres()).toEqual(['Ana', 'Bruno']);
  await userEvent.click(screen.getByRole('button', { name: 'Historial' })); expect(nombres()).toEqual(['Elena', 'Carla', 'Diego']);
  expect(screen.queryByRole('button', { name: 'Confirmar reserva' })).not.toBeInTheDocument();
});
test('el enlace directo conserva vista, búsqueda y filtros, y Atrás recupera la selección anterior', async () => {
  montar('/profesional/agenda?vista=reservas&grupo=historial&buscar=carla&estado=realizada');
  await screen.findByRole('search', { name: 'Buscar reservas' });
  expect(nombres()).toEqual(['Carla']);
  expect(screen.getByRole('searchbox', { name: 'Buscar' })).toHaveValue('carla');
  await userEvent.click(screen.getByRole('button', { name: 'Próximas' }));
  expect(screen.getByLabelText('Dirección de prueba')).toHaveTextContent('vista=reservas');
  expect(screen.getByLabelText('Dirección de prueba')).toHaveTextContent('grupo=proximas');
  expect(screen.getByRole('combobox', { name: 'Estado' })).toHaveValue('todos');
  await userEvent.click(screen.getByRole('button', { name: 'Volver de prueba' }));
  expect(screen.getByRole('button', { name: 'Historial' })).toHaveAttribute('aria-pressed', 'true');
  expect(nombres()).toEqual(['Carla']);
});
test('pagina de diez en diez, reinicia la página al filtrar y conserva el nombre completo', async () => {
  montar(undefined, Array.from({ length: 24 }, (_, i) => reserva(i + 1, i === 23 ? 'María Fernanda de los Ángeles Fernández Montenegro' : `Persona ${String(i + 1).padStart(2, '0')}`, '2099-10-15')));
  await screen.findByRole('search', { name: 'Buscar reservas' });
  expect(nombres()).toHaveLength(10);
  expect(screen.getByText('Mostrando 1–10 de 24')).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Página siguiente' }));
  expect(screen.getByText('Mostrando 11–20 de 24')).toBeInTheDocument();
  expect(screen.getByRole('region', { name: 'Lista de reservas' })).toHaveFocus();
  await userEvent.type(screen.getByRole('searchbox', { name: 'Buscar' }), 'montenegro');
  expect(nombres()).toEqual(['María Fernanda de los Ángeles Fernández Montenegro']);
  expect(screen.queryByRole('navigation', { name: 'Páginas de reservas' })).not.toBeInTheDocument();
  expect(screen.getByLabelText('Dirección de prueba').textContent).not.toContain('pagina=');
});
test('al confirmar desde Por confirmar actualiza la lista y el contador sin confundirlo con el historial', async () => {
  let datos = [filas[0]];
  simularApi({ '/api/reservas/1': (_u, o) => { datos = [{ ...filas[0], estado: JSON.parse(o.body).estado }]; return [200, { reserva: datos[0] }]; }, '/api/reservas': () => [200, { reservas: datos }] });
  render(<MemoryRouter initialEntries={['/profesional/agenda?vista=reservas&grupo=pendientes']}><SesionProvider><ListadoReservas profesional /></SesionProvider></MemoryRouter>);
  await userEvent.click(await screen.findByRole('button', { name: 'Confirmar reserva' }));
  await userEvent.click(screen.getByRole('button', { name: 'Confirmar cambio' }));
  expect(await screen.findByText('Reserva confirmada.')).toBeInTheDocument();
  await waitFor(() => expect(screen.getByRole('button', { name: 'Por confirmar' })).toHaveTextContent('0'));
  expect(screen.getByRole('heading', { name: 'No tienes reservas por confirmar' })).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Próximas' })); expect(nombres()).toEqual(['Ana']);
});
test('un rango de fechas invertido explica el error y no presenta resultados engañosos', async () => {
  montar('/profesional/agenda?vista=reservas&periodo=rango&desde=2099-10-20&hasta=2099-10-01');
  expect(await screen.findByRole('alert')).toHaveTextContent('La fecha “Desde” debe ser anterior o igual a “Hasta”');
  expect(nombres()).toEqual([]);
});
test('una reserva próxima pasa al historial cuando comienza sin recargar la página', async () => {
  vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] });
  vi.setSystemTime(new Date('2099-10-12T13:00:00Z'));
  montar('/profesional/agenda?vista=reservas&grupo=proximas', [reserva(1, 'Ana', '2099-10-12')]);
  await screen.findByRole('search', { name: 'Buscar reservas' });
  expect(nombres()).toEqual(['Ana']);
  act(() => vi.advanceTimersByTime(61 * 60000));
  expect(nombres()).toEqual([]);
  expect(screen.getByRole('heading', { name: 'No tienes próximas reservas' })).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Historial' }));
  expect(nombres()).toEqual(['Ana']);
  expect(within(screen.getByRole('article')).getByText('Realizada')).toBeInTheDocument();
});
test('Ver en calendario abre el día y el detalle de esa reserva', async () => {
  const desde = '2099-10-12';
  const r = filas[0];
  simularApi({ '/api/reservas': { reservas: [r] }, '/api/agenda/semana': { desde, hasta: '2099-10-18', hoy: desde, ahora: '10:00', modalidad: 'ambas', listaEspera: 0, bloqueos: [], horarios: [{ ...r.horario, estado: r.estado, pasado: false, bloqueado: false, reserva: { ...r, usuario: r.usuario } }] } });
  renderizarApp('/profesional/agenda?vista=reservas');
  await userEvent.click(await screen.findByRole('link', { name: 'Ver en calendario' }));
  expect(await screen.findByRole('region', { name: /jueves 15 de octubre/ })).toHaveTextContent('Ana');
  expect(screen.getByRole('tab', { name: /Calendario/ })).toHaveAttribute('aria-selected', 'true');
});

test('una reserva cancelada que comparte horario con otra no abre el detalle de la reserva vigente', async () => {
  const cancelada = { ...filas[0], estado: 'cancelada' };
  const vigente = { ...filas[1], horario: cancelada.horario };
  simularApi({
    '/api/reservas': { reservas: [cancelada, vigente] },
    '/api/agenda/semana': {
      desde: '2099-10-12', hasta: '2099-10-18', hoy: '2099-10-12', ahora: '10:00', modalidad: 'ambas',
      listaEspera: 0, bloqueos: [],
      horarios: [{ ...vigente.horario, estado: vigente.estado, pasado: false, bloqueado: false, reserva: vigente }],
    },
  });
  renderizarApp('/profesional/agenda?vista=reservas&grupo=historial');
  const enlace = await screen.findByRole('link', { name: 'Ver en calendario' });
  expect(enlace).toHaveAttribute('href', expect.stringContaining(`&reserva=${cancelada.id}`));
  await userEvent.click(enlace);
  const aviso = await screen.findByRole('region', { name: 'Reserva fuera del calendario' });
  expect(aviso).toHaveTextContent('La reserva seleccionada ya no aparece en el calendario.');
  expect(screen.queryByRole('link', { name: 'Bruno' })).not.toBeInTheDocument();
  await userEvent.click(within(aviso).getByRole('link', { name: 'Volver al historial' }));
  expect(await screen.findByRole('heading', { name: 'Ana' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Historial' })).toHaveAttribute('aria-pressed', 'true');
});

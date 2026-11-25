import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { StrictMode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, test, expect, vi } from 'vitest';
import { renderizarApp, simularApi, SESION, SESION_PROFESIONAL } from '../tests/utilidades.jsx';
import { SesionProvider } from '../context/SesionContext.jsx';
import AgendaProfesional from './Agenda.jsx';
const h = { id: 2, fecha: '2099-10-15', horaInicio: '09:00', horaFin: '10:00', ocupado: false };
const r = { id: 4, estado: 'pendiente', mensaje: 'Necesito orientación nutricional', horario: h, usuario: { id: 1, nombre: 'Ana' }, profesional: { id: 3, nombre: 'Juan' } };
beforeEach(() => sessionStorage.setItem('fitsearch_sesion', JSON.stringify(SESION_PROFESIONAL)));
afterEach(() => vi.useRealTimers());
// Fecha del sistema fija (solo Date, los temporizadores siguen reales) para que el calendario abra en octubre de 2099.
const fijarHoy = (iso) => { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date(iso)); };
// Desde el 09-11-2026 /profesional/agenda muestra el calendario semanal (AgendaSemanal.test.jsx). El formulario de
// publicar con calendario del mes y la lista de reservas siguen en Agenda.jsx (la pestaña Horarios del perfil los usa).
const renderizarAgendaClasica = () => render(
  <StrictMode><MemoryRouter><SesionProvider><AgendaProfesional /></SesionProvider></MemoryRouter></StrictMode>,
);
const dia = (nombre) => within(screen.getByRole('group', { name: /octubre 2099|noviembre 2099/ })).getByRole('button', { name: nombre });

test('editar avisa actualización; eliminar el bloque editado limpia el formulario sin afirmar historial', async () => {
  let horarios = [h];
  simularApi({
    '/api/disponibilidades/2': (_u,o) => {
      if (o.method === 'DELETE') { horarios=[]; return [200,{id:2}]; }
      return [200,{horario:h}];
    },
    '/api/disponibilidades': () => [200,{horarios}],
    '/api/reservas': { reservas:[] },
  });
  renderizarAgendaClasica();
  await userEvent.click(await screen.findByRole('button',{name:'Editar horario'}));
  // El calendario salta al mes del horario, marca su día y el foco queda en la hora de inicio.
  expect(screen.getByRole('heading', { name: 'octubre 2099' })).toBeInTheDocument();
  expect(dia('jueves 15 de octubre, 1 horario publicado')).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByLabelText('Hora de inicio')).toHaveFocus();
  await userEvent.click(screen.getByRole('button',{name:'Guardar horario'}));
  expect(await screen.findByText('Horario actualizado.')).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button',{name:'Editar horario'}));
  await userEvent.click(screen.getByRole('button',{name:'Retirar horario'}));
  await userEvent.click(screen.getByRole('button',{name:'Confirmar retiro'}));
  expect(await screen.findByText('Horario eliminado.')).toBeInTheDocument();
  expect(screen.getByText('Elige un día en el calendario')).toBeInTheDocument();
  expect(screen.getByLabelText('Hora de inicio')).toHaveValue('');
  expect(screen.queryByRole('button',{name:'Cancelar edición'})).not.toBeInTheDocument();
});

test('retira un bloque con historial cancelado solo tras confirmar y mantiene la reserva en historial', async () => {
  let horarios = [{ ...h, conHistorial: true }];
  const fetch = simularApi({
    '/api/disponibilidades/2': (_u, o) => {
      expect(o.method).toBe('DELETE');
      horarios = [];
      return [200, { id: 2, retirado: true }];
    },
    '/api/disponibilidades': () => [200, { horarios }],
    '/api/reservas': { reservas: [{ ...r, estado: 'cancelada', horario: { ...h, retirado: true } }] },
  });
  renderizarAgendaClasica();
  expect(await screen.findByRole('button', { name: 'Editar horario' })).toBeDisabled();
  await userEvent.click(screen.getByRole('button', { name: 'Retirar horario' }));
  expect(fetch.mock.calls.some(([, o]) => o.method === 'DELETE')).toBe(false);
  await userEvent.click(screen.getByRole('button', { name: 'Confirmar retiro' }));
  expect(await screen.findByText(/Horario retirado/)).toBeInTheDocument();
  expect(await screen.findByText('Aún no has publicado horarios disponibles.')).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: /^Todas(?: e historial)?$/ }));
  expect(await screen.findByText(r.mensaje)).toBeInTheDocument();
});
test('publica un horario eligiendo el día en el calendario y la duración rápida', async () => {
  fijarHoy('2099-10-10T15:00:00Z');
  let horarios = [{ ...h, id: 7, horaInicio: '11:00', horaFin: '12:00' }];
  const fetch = simularApi({ '/api/disponibilidades': (_u, o) => {
    if (o.method === 'POST') { horarios = [...horarios, h]; return [201, { horario: h }]; }
    return [200, { horarios }];
  } });
  renderizarAgendaClasica();
  expect(await screen.findByRole('heading', { name: 'octubre 2099' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Mes anterior' })).toBeDisabled();
  expect(dia('jueves 1 de octubre, día pasado')).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Publicar horario' })).toBeDisabled();
  expect(screen.getByRole('button', { name: '1 h' })).toBeDisabled();

  await userEvent.click(await screen.findByRole('button', { name: 'jueves 15 de octubre, 1 horario publicado' }));
  expect(screen.getByText('jueves 15 de octubre')).toBeInTheDocument();
  expect(screen.getByText('Ya publicaste: 11:00–12:00')).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Hora de inicio'), { target: { value: '09:00' } });
  await userEvent.click(screen.getByRole('button', { name: '1 h' }));
  expect(screen.getByLabelText('Hora de término')).toHaveValue('10:00');
  expect(screen.getByRole('button', { name: '1 h' })).toHaveAttribute('aria-pressed', 'true');
  await userEvent.click(screen.getByRole('button', { name: 'Publicar horario' }));

  expect(await screen.findByText('Horario publicado.')).toBeInTheDocument();
  expect(JSON.parse(fetch.mock.calls.find(([, o]) => o.method === 'POST')[1].body)).toEqual({ fecha: h.fecha, horaInicio: '09:00', horaFin: '10:00' });
  expect(await screen.findByRole('button', { name: 'jueves 15 de octubre, 2 horarios publicados' })).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Mes siguiente' }));
  expect(screen.getByRole('heading', { name: 'noviembre 2099' })).toBeInTheDocument();
});
test('no envía un horario que termina antes de empezar y lo avisa', async () => {
  fijarHoy('2099-10-10T15:00:00Z');
  const fetch = simularApi({ '/api/disponibilidades': { horarios: [] } });
  renderizarAgendaClasica();
  await userEvent.click(await screen.findByRole('button', { name: 'jueves 15 de octubre, sin horarios publicados' }));
  fireEvent.change(screen.getByLabelText('Hora de inicio'), { target: { value: '10:00' } });
  fireEvent.change(screen.getByLabelText('Hora de término'), { target: { value: '09:30' } });
  await userEvent.click(screen.getByRole('button', { name: 'Publicar horario' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('La hora de término debe ser posterior a la hora de inicio.');
  expect(fetch.mock.calls.some(([, o]) => o.method === 'POST')).toBe(false);
});
test('cancelar requiere confirmación explícita y actualiza el historial', async () => {
  let estado = 'pendiente';
  const fetch = simularApi({ '/api/reservas/4': () => { estado = 'cancelada'; return [200, { reserva: { ...r, estado } }]; }, '/api/reservas': () => [200, { reservas: [{ ...r, estado }] }] });
  // Desde el 15-11-2026 la lista de reservas recibidas va en la pestaña «Reservas» de la agenda.
  renderizarApp('/profesional/agenda?vista=reservas');
  await userEvent.click(await screen.findByRole('button', { name: 'Cancelar reserva' }));
  expect(fetch.mock.calls.some(([, o]) => o.method === 'PATCH')).toBe(false);
  await userEvent.click(screen.getByRole('button', { name: 'Confirmar cambio' }));
  expect(await screen.findByText(/Reserva cancelada/)).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: /^Todas(?: e historial)?$/ }));
  expect(within(await screen.findByRole('article')).getByText('Cancelada')).toBeInTheDocument();
});
test('la confirmación aparece dentro de la tarjeta elegida (no al final de la lista) y al volver el foco regresa al botón', async () => {
  const otra = { ...r, id: 5, usuario: { id: 2, nombre: 'Bruno' }, horario: { ...h, id: 3, horaInicio: '11:00', horaFin: '12:00' } };
  simularApi({ '/api/reservas': { reservas: [r, otra] } });
  renderizarApp('/profesional/agenda?vista=reservas');
  const tarjetaBruno = (await screen.findByRole('heading', { name: 'Bruno' })).closest('article');
  const cancelar = within(tarjetaBruno).getByRole('button', { name: 'Cancelar reserva' });
  await userEvent.click(cancelar);
  const pregunta = within(tarjetaBruno).getByRole('group', { name: '¿Cancelar esta reserva?' });
  expect(pregunta).toHaveFocus();
  expect(within(tarjetaBruno).queryByRole('button', { name: 'Cancelar reserva' })).not.toBeInTheDocument();
  expect(within(screen.getByRole('heading', { name: 'Ana' }).closest('article')).queryByRole('group')).not.toBeInTheDocument();

  await userEvent.click(within(pregunta).getByRole('button', { name: 'Volver' }));
  expect(cancelar).toHaveFocus();

  await userEvent.click(cancelar);
  await userEvent.keyboard('{Escape}');
  expect(within(tarjetaBruno).queryByRole('group')).not.toBeInTheDocument();
  expect(cancelar).toHaveFocus();
});

// Pedido del PO del 15-11-2026: buscador, filtros por estado y fecha, y el historial de la cita más reciente a la más antigua.
const reservaDe = (id, nombre, estado, fecha, horaInicio = '09:00') => ({
  ...r, id, estado, usuario: { id: id + 10, nombre }, profesional: { id: 3, nombre: nombre === 'Ana' ? 'Juan Soto' : 'Marta Ríos' },
  horario: { id: id + 20, fecha, horaInicio, horaFin: '10:00', ocupado: true },
});
const VARIAS = [
  reservaDe(41, 'Diego Lagos', 'pendiente', '2099-09-20'),
  reservaDe(42, 'José Núñez', 'cancelada', '2099-10-01'),
  reservaDe(43, 'Carla Soto', 'confirmada', '2099-10-05'),
  reservaDe(44, 'Ana', 'pendiente', '2099-10-15'),
  reservaDe(45, 'Bruno Díaz', 'confirmada', '2099-10-20', '11:00'),
];
const nombres = () => screen.queryAllByRole('article').map((a) => within(a).getByRole('heading').textContent);

test('las reservas recibidas se buscan por nombre y se filtran por estado y fecha; el historial va de la más reciente a la más antigua', async () => {
  fijarHoy('2099-10-12T13:00:00Z');
  simularApi({ '/api/reservas': { reservas: VARIAS } });
  renderizarApp('/profesional/agenda?vista=reservas');

  await screen.findByRole('search', { name: 'Buscar reservas' });
  await userEvent.click(screen.getByRole('button', { name: 'Próximas' }));
  expect(nombres()).toEqual(['Ana', 'Bruno Díaz']);
  expect(screen.getByText('2 reservas')).toBeInTheDocument();

  await userEvent.click(screen.getByRole('button', { name: /^Todas(?: e historial)?$/ }));
  expect(nombres()).toEqual(['Bruno Díaz', 'Ana', 'Carla Soto', 'José Núñez', 'Diego Lagos']);
  expect(screen.getByText('5 reservas, de la más reciente a la más antigua')).toBeInTheDocument();
  expect(within(screen.getAllByRole('article')[2]).getByText('Realizada')).toBeInTheDocument();
  expect(within(screen.getAllByRole('article')[4]).getByText('No realizada')).toBeInTheDocument();

  // Sin importar tildes ni mayúsculas.
  await userEvent.type(screen.getByRole('searchbox', { name: 'Buscar' }), 'jose nu');
  expect(nombres()).toEqual(['José Núñez']);
  await userEvent.click(screen.getByRole('button', { name: 'Limpiar filtros' }));
  expect(nombres()).toHaveLength(5);

  await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Estado' }), 'realizada');
  expect(nombres()).toEqual(['Carla Soto']);
  await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Estado' }), 'todos');

  await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Fecha de la cita' }), 'mesPasado');
  expect(nombres()).toEqual(['Diego Lagos']);
  await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Fecha de la cita' }), 'rango');
  fireEvent.change(screen.getByLabelText('Desde'), { target: { value: '2099-10-01' } });
  fireEvent.change(screen.getByLabelText('Hasta'), { target: { value: '2099-10-10' } });
  expect(nombres()).toEqual(['Carla Soto', 'José Núñez']);

  await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Estado' }), 'cancelada');
  await userEvent.type(screen.getByRole('searchbox', { name: 'Buscar' }), 'carla');
  expect(nombres()).toEqual([]);
  expect(screen.getByRole('heading', { name: 'No hay reservas con esos filtros' })).toBeInTheDocument();

  // En «Próximas» no hay canceladas ni «Mes pasado»: esos filtros vuelven a «todos».
  await userEvent.click(screen.getByRole('button', { name: 'Próximas' }));
  expect(screen.getByRole('combobox', { name: 'Estado' })).toHaveValue('todos');
  expect(within(screen.getByRole('combobox', { name: 'Estado' })).queryByRole('option', { name: 'Cancelada' })).not.toBeInTheDocument();
});

test('en «Mis citas» la persona busca por el nombre del profesional', async () => {
  sessionStorage.setItem('fitsearch_sesion', JSON.stringify(SESION));
  fijarHoy('2099-10-12T13:00:00Z');
  simularApi({ '/api/reservas': { reservas: VARIAS } });
  renderizarApp('/citas');
  await userEvent.click(await screen.findByRole('button', { name: /^Todas(?: e historial)?$/ }));
  await userEvent.type(screen.getByRole('searchbox', { name: 'Buscar' }), 'juan');
  expect(nombres()).toEqual(['Juan Soto']);
  expect(screen.getByText('1 cita, de la más reciente a la más antigua')).toBeInTheDocument();
});

test('Mis citas separa las próximas de las pasadas y canceladas, y solo permite cancelar citas vigentes', async () => {
  sessionStorage.setItem('fitsearch_sesion', JSON.stringify(SESION));
  fijarHoy('2099-10-12T13:00:00Z');
  let reservas = [
    reservaDe(31, 'Ana', 'confirmada', '2099-10-15'),
    reservaDe(32, 'Carla', 'confirmada', '2099-10-05'),
    reservaDe(33, 'Diego', 'cancelada', '2099-10-20'),
  ];
  simularApi({
    '/api/reservas': () => [200, { reservas }],
    '/api/reservas/31': () => {
      reservas = reservas.map((cita) => cita.id === 31 ? { ...cita, estado: 'cancelada' } : cita);
      return [200, { reserva: reservas[0] }];
    },
  });
  renderizarApp('/citas');
  await screen.findByRole('article');
  expect(nombres()).toEqual(['Juan Soto']);
  await userEvent.click(screen.getByRole('button', { name: 'Historial' }));
  expect(nombres()).toEqual(['Marta Ríos', 'Marta Ríos']);
  expect(screen.getByRole('link', { name: 'Calificar' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Cancelar cita' })).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Todas' }));
  expect(screen.getAllByRole('article')).toHaveLength(3);
  await userEvent.click(screen.getByRole('button', { name: 'Próximas' }));
  await userEvent.click(screen.getByRole('button', { name: 'Cancelar cita' }));
  await userEvent.click(screen.getByRole('button', { name: 'Sí, cancelar la cita' }));
  expect(await screen.findByRole('heading', { name: 'No tienes próximas citas' })).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Historial' }));
  expect(screen.getAllByRole('article')).toHaveLength(3);
});

test.each([
  ['hoy', ['Domingo']],
  ['semana', ['Domingo', 'Lunes']],
  ['mes', ['Fin', 'Siguiente', 'Domingo', 'Lunes', 'Inicio']],
  ['mesPasado', ['Anterior']],
])('el período %s incluye sus límites, también al consultar un domingo', async (periodo, esperados) => {
  fijarHoy('2099-10-18T15:00:00Z');
  const filas = [
    reservaDe(61, 'Anterior', 'confirmada', '2099-09-30'),
    reservaDe(62, 'Inicio', 'confirmada', '2099-10-01'),
    reservaDe(63, 'Lunes', 'confirmada', '2099-10-12'),
    reservaDe(64, 'Domingo', 'confirmada', '2099-10-18'),
    reservaDe(65, 'Siguiente', 'confirmada', '2099-10-19'),
    reservaDe(66, 'Fin', 'confirmada', '2099-10-31'),
    reservaDe(67, 'Otro mes', 'confirmada', '2099-11-01'),
  ];
  simularApi({ '/api/reservas': { reservas: filas } });
  renderizarApp('/profesional/agenda?vista=reservas');
  await userEvent.click(await screen.findByRole('button', { name: /^Todas(?: e historial)?$/ }));
  await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Fecha de la cita' }), periodo);
  expect(nombres()).toEqual(esperados);
});

test('Mes pasado en enero corresponde a diciembre del año anterior', async () => {
  fijarHoy('2100-01-10T15:00:00Z');
  simularApi({ '/api/reservas': { reservas: [
    reservaDe(71, 'Noviembre', 'confirmada', '2099-11-30'),
    reservaDe(72, 'Primero', 'confirmada', '2099-12-01'),
    reservaDe(73, 'Ultimo', 'confirmada', '2099-12-31'),
    reservaDe(74, 'Enero', 'confirmada', '2100-01-01'),
  ] } });
  renderizarApp('/profesional/agenda?vista=reservas');
  await userEvent.click(await screen.findByRole('button', { name: /^Todas(?: e historial)?$/ }));
  await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Fecha de la cita' }), 'mesPasado');
  expect(nombres()).toEqual(['Ultimo', 'Primero']);
});
// La reserva desde la ficha (calendario, horas, mensaje y límite por profesional) se prueba en components/reservas/ReservarHora.test.jsx.

// Revisión del PR 63 (16-11-2026): con «Mis citas» abierta (sin otro reloj en la página), una cita que comienza deja de
// ofrecer cancelarla y pasa al historial como no realizada, sin recargar.
test.each(['pendiente', 'confirmada'])('una cita %s que comienza con «Mis citas» abierta deja «Próximas» y actualiza su estado', async (estado) => {
  sessionStorage.setItem('fitsearch_sesion', JSON.stringify(SESION));
  vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] });
  vi.setSystemTime(new Date('2099-10-15T11:50:00Z'));
  simularApi({ '/api/reservas': { reservas: [{ ...r, estado }] } });
  renderizarApp('/citas');

  const tarjeta = (await screen.findByRole('heading', { name: 'Juan' })).closest('article');
  expect(within(tarjeta).getByText(estado === 'pendiente' ? 'Por confirmar' : 'Confirmada')).toBeInTheDocument();
  await userEvent.click(within(tarjeta).getByRole('button', { name: 'Cancelar cita' }));
  expect(within(tarjeta).getByRole('group', { name: '¿Cancelar esta cita?' })).toBeInTheDocument();

  // La cita era a las 09:00 (hora de Chile): pasan once minutos y ya comenzó.
  vi.setSystemTime(new Date('2099-10-15T12:01:00Z'));
  act(() => { vi.advanceTimersByTime(60000); });
  expect(screen.queryByRole('heading', { name: 'Juan' })).not.toBeInTheDocument();

  await userEvent.click(screen.getByRole('button', { name: 'Historial' }));
  const pasada = screen.getByRole('heading', { name: 'Juan' }).closest('article');
  expect(within(pasada).getByText(estado === 'pendiente' ? 'No realizada' : 'Realizada')).toBeInTheDocument();
  expect(within(pasada).queryByRole('group', { name: '¿Cancelar esta cita?' })).not.toBeInTheDocument();
  expect(within(pasada).queryByRole('button', { name: 'Cancelar cita' })).not.toBeInTheDocument();
});

import { fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, test, expect, vi } from 'vitest';
import { renderizarApp, simularApi, SESION_PROFESIONAL } from '../tests/utilidades.jsx';
const h = { id: 2, fecha: '2099-10-15', horaInicio: '09:00', horaFin: '10:00', ocupado: false };
const r = { id: 4, estado: 'pendiente', mensaje: 'Necesito orientación nutricional', horario: h, usuario: { id: 1, nombre: 'Ana' }, profesional: { id: 3, nombre: 'Juan' } };
beforeEach(() => sessionStorage.setItem('fitsearch_sesion', JSON.stringify(SESION_PROFESIONAL)));
afterEach(() => vi.useRealTimers());
// Fecha del sistema fija (solo Date, los temporizadores siguen reales) para que el calendario abra en octubre de 2099.
const fijarHoy = (iso) => { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date(iso)); };
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
  renderizarApp('/profesional/agenda');
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
  renderizarApp('/profesional/agenda');
  expect(await screen.findByRole('button', { name: 'Editar horario' })).toBeDisabled();
  await userEvent.click(screen.getByRole('button', { name: 'Retirar horario' }));
  expect(fetch.mock.calls.some(([, o]) => o.method === 'DELETE')).toBe(false);
  await userEvent.click(screen.getByRole('button', { name: 'Confirmar retiro' }));
  expect(await screen.findByText(/Horario retirado/)).toBeInTheDocument();
  expect(await screen.findByText('Aún no has publicado horarios disponibles.')).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Todas e historial' }));
  expect(await screen.findByText(r.mensaje)).toBeInTheDocument();
});
test('publica un horario eligiendo el día en el calendario y la duración rápida', async () => {
  fijarHoy('2099-10-10T15:00:00Z');
  let horarios = [{ ...h, id: 7, horaInicio: '11:00', horaFin: '12:00' }];
  const fetch = simularApi({ '/api/disponibilidades': (_u, o) => {
    if (o.method === 'POST') { horarios = [...horarios, h]; return [201, { horario: h }]; }
    return [200, { horarios }];
  } });
  renderizarApp('/profesional/agenda');
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
  renderizarApp('/profesional/agenda');
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
  renderizarApp('/profesional/agenda');
  await userEvent.click(await screen.findByRole('button', { name: 'Cancelar reserva' }));
  expect(fetch.mock.calls.some(([, o]) => o.method === 'PATCH')).toBe(false);
  await userEvent.click(screen.getByRole('button', { name: 'Confirmar cambio' }));
  expect(await screen.findByText(/Reserva cancelada/)).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Todas e historial' }));
  expect(await screen.findByText('cancelada')).toBeInTheDocument();
});
test('la confirmación aparece dentro de la tarjeta elegida (no al final de la lista) y al volver el foco regresa al botón', async () => {
  const otra = { ...r, id: 5, usuario: { id: 2, nombre: 'Bruno' }, horario: { ...h, id: 3, horaInicio: '11:00', horaFin: '12:00' } };
  simularApi({ '/api/reservas': { reservas: [r, otra] } });
  renderizarApp('/profesional/agenda');
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
// La reserva desde la ficha (calendario, horas, mensaje y límite por profesional) se prueba en components/reservas/ReservarHora.test.jsx.

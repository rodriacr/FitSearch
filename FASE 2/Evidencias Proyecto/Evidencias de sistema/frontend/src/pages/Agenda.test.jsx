import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, test, expect } from 'vitest';
import { renderizarApp, simularApi, SESION, SESION_PROFESIONAL, fichaProfesional } from '../tests/utilidades.jsx';
const h = { id: 2, fecha: '2099-10-15', horaInicio: '09:00', horaFin: '10:00', ocupado: false };
const r = { id: 4, estado: 'pendiente', mensaje: 'Necesito orientación nutricional', horario: h, usuario: { id: 1, nombre: 'Ana' }, profesional: { id: 3, nombre: 'Juan' } };
beforeEach(() => sessionStorage.setItem('fitsearch_sesion', JSON.stringify(SESION_PROFESIONAL)));

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
  await userEvent.click(screen.getByRole('button',{name:'Guardar horario'}));
  expect(await screen.findByText('Horario actualizado.')).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button',{name:'Editar horario'}));
  await userEvent.click(screen.getByRole('button',{name:'Retirar horario'}));
  await userEvent.click(screen.getByRole('button',{name:'Confirmar retiro'}));
  expect(await screen.findByText('Horario eliminado.')).toBeInTheDocument();
  expect(screen.getByLabelText('Fecha')).toHaveValue('');
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
test('publica horarios y conserva los valores ante una superposición', async () => {
  let horarios = [];
  const fetch = simularApi({ '/api/disponibilidades': (_u, o) => {
    if (o.method === 'POST') { horarios = [h]; return [201, { horario: h }]; }
    return [200, { horarios }];
  } });
  renderizarApp('/profesional/agenda');
  fireEvent.change(await screen.findByLabelText('Fecha'), { target: { value: h.fecha } });
  fireEvent.change(screen.getByLabelText('Hora de inicio'), { target: { value: h.horaInicio } });
  fireEvent.change(screen.getByLabelText('Hora de término'), { target: { value: h.horaFin } });
  await userEvent.click(screen.getByRole('button', { name: 'Publicar horario' }));
  expect(await screen.findByText('Horario publicado.')).toBeInTheDocument();
  expect(JSON.parse(fetch.mock.calls.find(([, o]) => o.method === 'POST')[1].body)).toEqual({ fecha: h.fecha, horaInicio: '09:00', horaFin: '10:00' });
  expect(await screen.findByText('Disponible')).toBeInTheDocument();
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
test('reserva desde la ficha con mensaje obligatorio; conflicto conserva el mensaje y actualiza horas', async () => {
  sessionStorage.setItem('fitsearch_sesion', JSON.stringify(SESION));
  let horarios = [h];
  const fetch = simularApi({ '/api/profesionales/3/disponibilidades': () => [200, { horarios }], '/api/profesionales/3/resenas': { resenas: [], pagina: 1, total: 0, totalPaginas: 0 }, '/api/profesionales/3': { profesional: fichaProfesional({ id: 3 }), resumenResenas: { promedio: null, total: 0, distribucion: [] }, miResena: null, puedeResenar: false }, '/api/reservas': (_u,o) => { if(o.method==='POST'){ horarios=[]; return [409,{error:'El horario ya no está disponible'}]; } return [200,{reservas:[]}]; } });
  renderizarApp('/profesionales/3');
  await userEvent.selectOptions(await screen.findByLabelText('Horario disponible'), '2');
  await userEvent.type(screen.getByLabelText('Qué necesitas consultar'), r.mensaje);
  await userEvent.click(screen.getByRole('button', { name: 'Enviar solicitud de reserva' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('El horario ya no está disponible');
  await waitFor(() => expect(screen.getByText('Este profesional no tiene horarios disponibles por ahora.')).toBeInTheDocument());
  expect(JSON.parse(fetch.mock.calls.find(([, o]) => o.method==='POST')[1].body)).toEqual({ disponibilidadId: 2, mensaje: r.mensaje });
});

// Límite del PO: una reserva activa por usuario con cada profesional.
const fichaDe3 = { '/api/profesionales/3/disponibilidades': { horarios: [h] }, '/api/profesionales/3/resenas': { resenas: [], pagina: 1, total: 0, totalPaginas: 0 }, '/api/profesionales/3': { profesional: fichaProfesional({ id: 3 }), resumenResenas: { promedio: null, total: 0, distribucion: [] }, miResena: null, puedeResenar: false } };
test('con una reserva activa y futura con el profesional, avisa antes y no muestra el formulario', async () => {
  sessionStorage.setItem('fitsearch_sesion', JSON.stringify(SESION));
  simularApi({ ...fichaDe3, '/api/reservas': { reservas: [{ ...r, horario: { ...h, id: 9 } }] } });
  renderizarApp('/profesionales/3');
  const avisoActiva = await screen.findByText(/Ya tienes una reserva pendiente con este profesional/);
  expect(within(avisoActiva).getByRole('link', { name: 'Mis citas' })).toHaveAttribute('href', '/citas');
  expect(screen.queryByLabelText('Horario disponible')).not.toBeInTheDocument();
});
test('una reserva pasada o cancelada con el profesional no impide reservar', async () => {
  sessionStorage.setItem('fitsearch_sesion', JSON.stringify(SESION));
  simularApi({ ...fichaDe3, '/api/reservas': { reservas: [
    { ...r, id: 5, estado: 'confirmada', horario: { ...h, id: 7, fecha: '2020-01-01' } },
    { ...r, id: 6, estado: 'cancelada', horario: { ...h, id: 8 } },
  ] } });
  renderizarApp('/profesionales/3');
  expect(await screen.findByLabelText('Horario disponible')).toBeInTheDocument();
  expect(screen.queryByText(/Ya tienes una reserva/)).not.toBeInTheDocument();
});
test('el 409 del límite conserva la hora elegida en vez de tratarla como ocupada', async () => {
  sessionStorage.setItem('fitsearch_sesion', JSON.stringify(SESION));
  simularApi({ ...fichaDe3, '/api/reservas': (_u, o) => o.method === 'POST'
    ? [409, { error: 'Ya tienes una reserva activa con este profesional. Cancélala antes de reservar otra hora', detalles: { motivo: 'limite_por_profesional' } }]
    : [200, { reservas: [] }] });
  renderizarApp('/profesionales/3');
  await userEvent.selectOptions(await screen.findByLabelText('Horario disponible'), '2');
  await userEvent.type(screen.getByLabelText('Qué necesitas consultar'), r.mensaje);
  await userEvent.click(screen.getByRole('button', { name: 'Enviar solicitud de reserva' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Ya tienes una reserva activa con este profesional');
  expect(screen.getByLabelText('Horario disponible')).toHaveValue('2');
  expect(screen.getByLabelText('Qué necesitas consultar')).toHaveValue(r.mensaje);
});

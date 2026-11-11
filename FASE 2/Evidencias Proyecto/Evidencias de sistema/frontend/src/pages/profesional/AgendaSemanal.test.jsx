// Mi agenda semanal del profesional (mejoras del 09-11-2026): semana, detalle, publicar en serie, bloquear fechas y
// vista de un día en pantallas angostas.
import { fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { llamadasA, renderizarApp, simularApi, SESION_PROFESIONAL } from '../../tests/utilidades.jsx';

// Lunes 12 de octubre de 2099 a las 10:00 en Chile (13:00 UTC).
const fijarHoy = () => { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2099-10-12T13:00:00Z')); };
const ana = { id: 4, nombre: 'Ana Pérez' };
const SEMANA = {
  desde: '2099-10-12', hasta: '2099-10-18', hoy: '2099-10-12', ahora: '10:00', zonaHoraria: 'America/Santiago', modalidad: 'ambas', listaEspera: 2,
  bloqueos: [{ id: 1, fechaInicio: '2099-10-17', fechaFin: '2099-10-17', motivo: 'Congreso' }],
  horarios: [
    { id: 10, fecha: '2099-10-12', horaInicio: '11:00', horaFin: '12:00', pasado: false, bloqueado: false, estado: 'libre', reserva: null },
    { id: 11, fecha: '2099-10-13', horaInicio: '09:00', horaFin: '09:45', pasado: false, bloqueado: false, estado: 'pendiente',
      reserva: { id: 5, usuario: ana, mensaje: 'Quiero una evaluación de fuerza', modalidad: 'online', primeraVisita: true } },
    { id: 12, fecha: '2099-10-14', horaInicio: '15:00', horaFin: '16:00', pasado: false, bloqueado: false, estado: 'confirmada',
      reserva: { id: 6, usuario: { id: 8, nombre: 'Bruno Díaz' }, mensaje: 'Control mensual', modalidad: 'presencial', primeraVisita: false } },
  ],
};
const PENDIENTE = { id: 5, estado: 'pendiente', mensaje: 'Quiero una evaluación de fuerza', horario: { id: 11, fecha: '2099-10-13', horaInicio: '09:00', horaFin: '09:45' }, usuario: ana, profesional: { id: 3, nombre: 'Matías' } };

beforeEach(() => {
  sessionStorage.setItem('fitsearch_sesion', JSON.stringify(SESION_PROFESIONAL));
  fijarHoy();
});
afterEach(() => {
  vi.useRealTimers();
  window.innerWidth = 1024;
});

describe('semana', () => {
  test('muestra la semana con sus horarios, la lista de espera y lo que falta confirmar; confirmar avisa y recarga', async () => {
    let semana = SEMANA;
    const fetch = simularApi({
      '/api/agenda/semana': () => [200, semana],
      '/api/reservas/5': () => {
        semana = { ...SEMANA, horarios: SEMANA.horarios.map((h) => (h.id === 11 ? { ...h, estado: 'confirmada' } : h)) };
        return [200, { reserva: { ...PENDIENTE, estado: 'confirmada' } }];
      },
      '/api/reservas': { reservas: [PENDIENTE] },
    });
    renderizarApp('/profesional/agenda');

    expect(await screen.findByRole('heading', { level: 2, name: '12 – 18 de octubre de 2099' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'lunes 12 de octubre, 11:00 a 12:00, libre' })).toBeInTheDocument();
    expect(screen.getByTitle('Congreso')).toHaveTextContent('Bloqueado');
    expect(screen.getByText(/2 personas esperan/)).toBeInTheDocument();
    const porConfirmar = screen.getByRole('heading', { name: /Por confirmar/ }).closest('section');
    expect(within(porConfirmar).getByText('Ana Pérez')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'martes 13 de octubre, 09:00 a 09:45, Ana Pérez, por confirmar' }));
    const detalle = screen.getByRole('region', { name: 'martes 13 de octubre' });
    expect(within(detalle).getByText('Quiero una evaluación de fuerza')).toBeInTheDocument();
    expect(within(detalle).getByText('Online')).toBeInTheDocument();
    expect(within(detalle).getByRole('link', { name: 'Ana Pérez' })).toHaveAttribute('href', '/profesional/clientes/4');
    expect(within(detalle).getByRole('link', { name: /Mensajes/ })).toHaveAttribute('href', '/profesional/mensajes?reserva=5');
    await userEvent.click(within(detalle).getByRole('button', { name: /Confirmar/ }));

    expect(await screen.findByText('Reserva confirmada. Le avisamos por correo.')).toBeInTheDocument();
    expect(JSON.parse(llamadasA(fetch, '/api/reservas/5')[0][1].body)).toEqual({ estado: 'confirmada' });
    expect(await screen.findByRole('button', { name: 'martes 13 de octubre, 09:00 a 09:45, Ana Pérez, confirmada' })).toBeInTheDocument();
  });

  test('cancelar una reserva pide confirmación antes de enviar', async () => {
    const fetch = simularApi({ '/api/agenda/semana': SEMANA, '/api/reservas/6': { reserva: {} } });
    renderizarApp('/profesional/agenda');
    await userEvent.click(await screen.findByRole('button', { name: /Bruno Díaz, confirmada/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar reserva' }));
    expect(llamadasA(fetch, '/api/reservas/6')).toHaveLength(0);
    await userEvent.click(screen.getByRole('button', { name: 'Sí, cancelar' }));
    expect(JSON.parse(llamadasA(fetch, '/api/reservas/6')[0][1].body)).toEqual({ estado: 'cancelada' });
  });

  test('las flechas cambian de semana y la dirección guarda la semana elegida', async () => {
    const fetch = simularApi({ '/api/agenda/semana': (url) => [200, url.includes('2099-10-19') ? { ...SEMANA, desde: '2099-10-19', hasta: '2099-10-25', horarios: [] } : SEMANA] });
    renderizarApp('/profesional/agenda');
    await screen.findByRole('heading', { level: 2, name: '12 – 18 de octubre de 2099' });
    expect(screen.getByRole('button', { name: 'Hoy' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Semana siguiente' }));
    expect(await screen.findByRole('heading', { level: 2, name: '19 – 25 de octubre de 2099' })).toBeInTheDocument();
    expect(llamadasA(fetch, '/api/agenda/semana?desde=2099-10-19')).not.toHaveLength(0);
    expect(await screen.findByText(/No tienes horarios esta semana/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Hoy' })).toBeEnabled();
  });
});

describe('publicar y bloquear', () => {
  test('publica varios bloques de una vez y muestra cuántos y cuáles antes de enviar', async () => {
    const fetch = simularApi({
      '/api/agenda/semana': SEMANA,
      '/api/disponibilidades/serie': { horarios: [{ id: 20 }, { id: 21 }], omitidos: [{ horaInicio: '10:30', horaFin: '11:15' }] },
    });
    renderizarApp('/profesional/agenda');
    await userEvent.click(await screen.findByRole('button', { name: 'Publicar horarios' }));
    const panel = screen.getByRole('region', { name: 'Publicar horarios' });
    fireEvent.change(within(panel).getByLabelText('Día'), { target: { value: '2099-10-15' } });
    fireEvent.change(within(panel).getByLabelText('Desde'), { target: { value: '09:00' } });
    fireEvent.change(within(panel).getByLabelText('Hasta'), { target: { value: '11:30' } });
    await userEvent.click(within(panel).getByRole('button', { name: '45 min' }));
    expect(within(panel).getByText('Se publicarán 3 horarios: 09:00, 09:45 y 10:30.')).toBeInTheDocument();
    await userEvent.click(within(panel).getByRole('button', { name: 'Publicar' }));

    expect(await screen.findByText(/Publicaste 2 horarios el jueves 15 de octubre\. 1 no se publicaron/)).toBeInTheDocument();
    expect(JSON.parse(llamadasA(fetch, '/api/disponibilidades/serie')[0][1].body))
      .toEqual({ fecha: '2099-10-15', horaInicio: '09:00', horaFin: '11:30', duracion: 45 });
  });

  test('un solo bloque va a /disponibilidades y un rango sin bloque completo no se envía', async () => {
    const fetch = simularApi({ '/api/agenda/semana': SEMANA, '/api/disponibilidades': (_u, o) => (o.method === 'POST' ? [201, { horario: {} }] : [200, { horarios: [] }]) });
    renderizarApp('/profesional/agenda');
    await userEvent.click(await screen.findByRole('button', { name: 'Publicar horarios' }));
    const panel = screen.getByRole('region', { name: 'Publicar horarios' });
    await userEvent.click(within(panel).getByRole('checkbox', { name: 'Dividir en varios bloques' }));
    fireEvent.change(within(panel).getByLabelText('Desde'), { target: { value: '12:00' } });
    fireEvent.change(within(panel).getByLabelText('Hasta'), { target: { value: '11:00' } });
    expect(within(panel).getByRole('button', { name: 'Publicar' })).toBeDisabled();
    fireEvent.change(within(panel).getByLabelText('Hasta'), { target: { value: '13:00' } });
    await userEvent.click(within(panel).getByRole('button', { name: 'Publicar' }));
    const post = llamadasA(fetch, '/api/disponibilidades').find(([, o]) => o.method === 'POST');
    expect(JSON.parse(post[1].body)).toEqual({ fecha: '2099-10-12', horaInicio: '12:00', horaFin: '13:00' });
  });

  test('bloquear fechas envía el rango y muestra el motivo del rechazo si hay reservas activas', async () => {
    const fetch = simularApi({
      '/api/agenda/semana': SEMANA,
      '/api/agenda/bloqueos': (_u, o) => (o.method === 'POST'
        ? [409, { error: 'Tienes 1 reserva activa en esas fechas. Cancélalas antes de bloquearlas' }]
        : [200, { bloqueos: [{ id: 1, fechaInicio: '2099-10-17', fechaFin: '2099-10-17', motivo: 'Congreso' }] }]),
    });
    renderizarApp('/profesional/agenda');
    await userEvent.click(await screen.findByRole('button', { name: 'Bloquear fechas' }));
    const panel = screen.getByRole('region', { name: 'Bloquear fechas' });
    expect(await within(panel).findByText('sáb 17 oct')).toBeInTheDocument();
    fireEvent.change(within(panel).getByLabelText('Hasta'), { target: { value: '2099-10-14' } });
    await userEvent.type(within(panel).getByLabelText('Motivo (opcional)'), 'Vacaciones');
    await userEvent.click(within(panel).getByRole('button', { name: 'Bloquear fechas' }));
    expect(await within(panel).findByRole('alert')).toHaveTextContent('Tienes 1 reserva activa');
    const post = llamadasA(fetch, '/api/agenda/bloqueos').find(([, o]) => o.method === 'POST');
    expect(JSON.parse(post[1].body)).toEqual({ fechaInicio: '2099-10-12', fechaFin: '2099-10-14', motivo: 'Vacaciones' });
  });
});

test('en una pantalla angosta muestra un día a la vez con sus horarios', async () => {
  window.innerWidth = 375;
  simularApi({ '/api/agenda/semana': SEMANA });
  renderizarApp('/profesional/agenda');
  const dias = await screen.findByRole('group', { name: 'Día de la semana' });
  expect(within(dias).getAllByRole('button')).toHaveLength(7);
  expect(within(dias).getByRole('button', { name: /lunes 12 de octubre/ })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByText('Horario libre')).toBeInTheDocument();
  await userEvent.click(within(dias).getByRole('button', { name: /martes 13 de octubre: 1 horario, 1 cita/ }));
  expect(screen.getByRole('button', { name: /Ana Pérez, por confirmar/ })).toBeInTheDocument();
  await userEvent.click(within(dias).getByRole('button', { name: /sábado 17 de octubre/ }));
  expect(screen.getByText(/Día bloqueado: Congreso/)).toBeInTheDocument();
});

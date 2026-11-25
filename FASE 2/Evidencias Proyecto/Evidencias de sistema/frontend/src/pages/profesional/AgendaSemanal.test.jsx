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
    expect(within(panel).getByText('3 horarios para publicar')).toBeInTheDocument();
    expect(within(panel).getByText('Quedan 15 min fuera de los bloques completos.')).toBeInTheDocument();
    await userEvent.click(within(panel).getByText('Ver bloques'));
    expect(within(panel).getByText('10:30–11:15')).toBeVisible();
    expect(document.querySelectorAll('.horario--nuevo')).toHaveLength(3);
    await userEvent.click(within(panel).getByRole('button', { name: 'Publicar 3 horarios' }));

    expect(await screen.findByText(/Publicaste 2 horarios el jueves 15 de octubre\. 1 horario con cruce: 10:30–11:15/)).toBeInTheDocument();
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
    expect(within(panel).getByRole('button', { name: 'Publicar horario' })).toBeDisabled();
    fireEvent.change(within(panel).getByLabelText('Hasta'), { target: { value: '13:00' } });
    await userEvent.click(within(panel).getByRole('button', { name: 'Publicar horario' }));
    const post = llamadasA(fetch, '/api/disponibilidades').find(([, o]) => o.method === 'POST');
    expect(JSON.parse(post[1].body)).toEqual({ fecha: '2099-10-12', horaInicio: '12:00', horaFin: '13:00' });
  });

  test('avisa de cruces, horas pasadas y días bloqueados antes de publicar', async () => {
    const fetch = simularApi({ '/api/agenda/semana': SEMANA });
    renderizarApp('/profesional/agenda');
    await screen.findByRole('button', { name: /lunes 12 de octubre, 11:00/ });
    await userEvent.click(screen.getByRole('button', { name: 'Publicar horarios' }));
    const panel = within(screen.getByRole('region', { name: 'Publicar horarios' }));
    expect(panel.getByLabelText('Desde')).toHaveValue('10:30');
    fireEvent.change(panel.getByLabelText('Desde'), { target: { value: '09:00' } });
    expect(panel.getByText('El horario debe comenzar más tarde, en hora de Chile.')).toBeInTheDocument();
    expect(panel.getByRole('button', { name: 'Publicar horario' })).toBeDisabled();

    fireEvent.change(panel.getByLabelText('Desde'), { target: { value: '11:00' } });
    fireEvent.change(panel.getByLabelText('Hasta'), { target: { value: '13:00' } });
    expect(panel.getByText('1 horario con cruce en tu agenda.')).toBeInTheDocument();
    expect(document.querySelectorAll('.horario--nuevo')).toHaveLength(1);
    expect(document.querySelector('.horario--nuevo')).toHaveTextContent('12:00');
    fireEvent.change(panel.getByLabelText('Hasta'), { target: { value: '12:00' } });
    expect(panel.getByText('Todos los bloques coinciden con horarios publicados.')).toBeInTheDocument();
    expect(panel.getByRole('button', { name: 'Publicar horario' })).toBeDisabled();

    fireEvent.change(panel.getByLabelText('Día'), { target: { value: '2099-10-17' } });
    expect(panel.getByText('Este día está bloqueado. Elige otro día para publicar.')).toBeInTheDocument();
    expect(llamadasA(fetch, '/api/disponibilidades/serie')).toHaveLength(0);
  });

  test('al elegir otro día, el calendario muestra la semana de la publicación', async () => {
    const fetch = simularApi({ '/api/agenda/semana': (url) => [200, url.includes('2099-10-19')
      ? { ...SEMANA, desde: '2099-10-19', hasta: '2099-10-25', horarios: [] } : SEMANA] });
    renderizarApp('/profesional/agenda');
    await userEvent.click(await screen.findByRole('button', { name: 'Publicar horarios' }));
    const panel = within(screen.getByRole('region', { name: 'Publicar horarios' }));
    fireEvent.change(panel.getByLabelText('Día'), { target: { value: '2099-10-22' } });
    expect(await screen.findByRole('heading', { name: '19 – 25 de octubre de 2099' })).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: /^Ver las reservas del jueves 22 de octubre/ })).toHaveAttribute('aria-pressed', 'true');
    expect(llamadasA(fetch, '/api/agenda/semana?desde=2099-10-19')).toHaveLength(1);
    expect(document.querySelectorAll('.horario--nuevo')).toHaveLength(4);
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
  await userEvent.click(within(dias).getByRole('button', { name: /martes 13 de octubre: 1 horario, 1 reserva/ }));
  expect(screen.getByRole('button', { name: /Ana Pérez, por confirmar/ })).toBeInTheDocument();
  await userEvent.click(within(dias).getByRole('button', { name: /sábado 17 de octubre/ }));
  expect(screen.getByText(/Día bloqueado: Congreso/)).toBeInTheDocument();
});

// Pedidos del PO del 15-11-2026: estados de las horas que ya pasaron, pestañas Calendario y Reservas, y las reservas del día.
const carla = { id: 9, nombre: 'Carla Soto' };
const diego = { id: 10, nombre: 'Diego Lagos' };
const CON_PASADAS = {
  ...SEMANA,
  horarios: [
    { id: 20, fecha: '2099-10-12', horaInicio: '08:00', horaFin: '08:45', pasado: true, bloqueado: false, estado: 'confirmada',
      reserva: { id: 30, usuario: carla, mensaje: 'Control', modalidad: 'presencial', primeraVisita: false } },
    { id: 21, fecha: '2099-10-12', horaInicio: '09:00', horaFin: '09:45', pasado: true, bloqueado: false, estado: 'pendiente',
      reserva: { id: 31, usuario: diego, mensaje: 'Evaluación', modalidad: 'online', primeraVisita: true } },
    ...SEMANA.horarios,
    { id: 22, fecha: '2099-10-17', horaInicio: '10:00', horaFin: '11:00', pasado: false, bloqueado: true, estado: 'libre', reserva: null },
  ],
};

describe('estados, pestañas y reservas del día', () => {
  test('las horas que ya pasaron dicen si se realizaron, con su color y su explicación en el detalle', async () => {
    simularApi({ '/api/agenda/semana': CON_PASADAS, '/api/reservas': { reservas: [PENDIENTE] } });
    renderizarApp('/profesional/agenda');

    const leyenda = await screen.findByRole('list', { name: 'Colores del calendario' });
    expect(within(leyenda).getAllByRole('listitem').map((li) => li.textContent))
      .toEqual(['Libre', 'Por confirmar', 'Confirmada', 'Realizada', 'No realizada', 'Bloqueado']);
    const realizada = await screen.findByRole('button', { name: 'lunes 12 de octubre, 08:00 a 08:45, Carla Soto, realizada' });
    expect(realizada).toHaveClass('horario--realizada');
    expect(screen.getByRole('button', { name: 'lunes 12 de octubre, 09:00 a 09:45, Diego Lagos, no realizada' })).toHaveClass('horario--noRealizada');
    expect(screen.getByRole('button', { name: 'sábado 17 de octubre, 10:00 a 11:00, bloqueado' })).toHaveClass('horario--bloqueado');
    expect(screen.getByRole('button', { name: /Bruno Díaz, confirmada/ })).toHaveClass('horario--confirmada');
    expect(screen.queryByText(/ya pasó/i)).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /^lunes 12 de octubre, 09:00 a 09:45, Diego Lagos/ }));
    const detalle = screen.getByRole('region', { name: 'lunes 12 de octubre' });
    expect(within(detalle).getByText('No realizada')).toHaveClass('estado-agenda--noRealizada');
    expect(within(detalle).getByText('La reserva no se confirmó antes de la hora de la cita.')).toBeInTheDocument();
    expect(within(detalle).queryByRole('button', { name: /Confirmar/ })).not.toBeInTheDocument();
  });

  test('el costado lista todas las reservas del día por hora; se cambia de día con la cabecera, las flechas o la fecha', async () => {
    const fetch = simularApi({
      '/api/agenda/semana': (url) => [200, url.includes('2099-10-19') ? { ...SEMANA, desde: '2099-10-19', hasta: '2099-10-25', horarios: [] } : CON_PASADAS],
      '/api/reservas': { reservas: [PENDIENTE] },
    });
    renderizarApp('/profesional/agenda');

    const delDia = (await screen.findByRole('heading', { name: 'Reservas del día' })).closest('section');
    expect(within(delDia).getByText('Hoy, lunes 12 de octubre')).toBeInTheDocument();
    const hoy = within(delDia).getByRole('list', { name: 'Reservas del lunes 12 de octubre' });
    expect(within(hoy).getAllByRole('button').map((b) => b.getAttribute('aria-label'))).toEqual([
      '08:00 a 08:45, Carla Soto, realizada, presencial',
      '09:00 a 09:45, Diego Lagos, no realizada, online',
    ]);
    const cifra = (nombre) => within(delDia).getByText(nombre).closest('div').querySelector('dd').textContent;
    expect(cifra('Reservas')).toBe('2');
    expect(cifra('Horas libres')).toBe('1');

    // La cabecera del calendario elige el día.
    await userEvent.click(screen.getByRole('button', { name: 'Ver las reservas del martes 13 de octubre: 1 reserva' }));
    expect(screen.getByRole('button', { name: /Ver las reservas del martes 13 de octubre/ })).toHaveAttribute('aria-pressed', 'true');
    const martes = screen.getByRole('list', { name: 'Reservas del martes 13 de octubre' });
    await userEvent.click(within(martes).getByRole('button', { name: /Ana Pérez, por confirmar, online/ }));
    expect(within(screen.getByRole('region', { name: 'martes 13 de octubre' })).getByRole('button', { name: /Confirmar/ })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Cerrar panel' }));

    // Las flechas avanzan de a un día.
    await userEvent.click(screen.getByRole('button', { name: 'Día siguiente' }));
    expect(screen.getByText('miércoles 14 de octubre')).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Reservas del miércoles 14 de octubre' })).toHaveTextContent('Bruno Díaz');
    await userEvent.click(screen.getByRole('button', { name: 'Ir a hoy' }));
    expect(screen.getByText('Hoy, lunes 12 de octubre')).toBeInTheDocument();

    // Un día de otra semana lleva el calendario a esa semana.
    fireEvent.change(screen.getByLabelText('Elegir el día'), { target: { value: '2099-10-21' } });
    expect(await screen.findByRole('heading', { level: 2, name: '19 – 25 de octubre de 2099' })).toBeInTheDocument();
    expect(llamadasA(fetch, '/api/agenda/semana?desde=2099-10-19')).not.toHaveLength(0);
    expect(await screen.findByText('miércoles 21 de octubre')).toBeInTheDocument();
    expect(screen.getByText('No tienes reservas este día.')).toBeInTheDocument();
  });

  test('las pestañas separan el calendario de las reservas recibidas, con las por confirmar primero', async () => {
    const confirmada = { ...PENDIENTE, id: 6, estado: 'confirmada', usuario: { id: 8, nombre: 'Bruno Díaz' }, horario: { ...PENDIENTE.horario, id: 12, fecha: '2099-10-12', horaInicio: '15:00' } };
    simularApi({ '/api/agenda/semana': SEMANA, '/api/reservas': { reservas: [confirmada, PENDIENTE] } });
    renderizarApp('/profesional/agenda');

    const pestanas = await screen.findByRole('tablist', { name: 'Partes de la agenda' });
    const calendario = within(pestanas).getByRole('tab', { name: /Calendario/ });
    const reservas = await within(pestanas).findByRole('tab', { name: /Reservas.*1 por confirmar/ });
    expect(calendario).toHaveAttribute('aria-selected', 'true');
    expect(screen.queryByRole('heading', { name: 'Reservas recibidas' })).not.toBeInTheDocument();

    await userEvent.click(reservas);
    expect(reservas).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel')).toHaveAttribute('id', 'vista-reservas');
    expect(await screen.findByRole('heading', { name: 'Reservas recibidas' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Publicar horarios' })).not.toBeInTheDocument();
    const tarjetas = await screen.findAllByRole('article');
    expect(within(tarjetas[0]).getByRole('heading', { name: 'Ana Pérez' })).toBeInTheDocument();
    expect(within(tarjetas[0]).getByText('Por confirmar')).toBeInTheDocument();
    expect(within(tarjetas[1]).getByText('Confirmada')).toBeInTheDocument();

    // Con el teclado: flechas entre pestañas.
    reservas.focus();
    await userEvent.keyboard('{ArrowLeft}');
    expect(calendario).toHaveAttribute('aria-selected', 'true');
    expect(calendario).toHaveFocus();
    expect(await screen.findByRole('heading', { level: 2, name: '12 – 18 de octubre de 2099' })).toBeInTheDocument();
  });

  // Segunda revisión del PO (15-11-2026): con el detalle o el formulario abiertos, tocar un día no mostraba sus reservas.
  test('tocar un día cierra el detalle o el formulario abierto y muestra sus reservas; la casilla elegida se marca', async () => {
    simularApi({ '/api/agenda/semana': SEMANA, '/api/reservas': { reservas: [PENDIENTE] } });
    renderizarApp('/profesional/agenda');

    await userEvent.click(await screen.findByRole('button', { name: /Ana Pérez, por confirmar/ }));
    expect(screen.getByRole('region', { name: 'martes 13 de octubre' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /^Ver las reservas del miércoles 14 de octubre/ }));
    expect(screen.queryByRole('region', { name: 'martes 13 de octubre' })).not.toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Reservas del miércoles 14 de octubre' })).toHaveTextContent('Bruno Díaz');

    // Una casilla vacía del jueves 15 abre «Publicar horarios» y queda marcada en el calendario, siguiendo al formulario.
    const jueves = document.querySelectorAll('.semana__columna')[3];
    fireEvent.click(jueves, { clientY: 100 });
    const panel = screen.getByRole('region', { name: 'Publicar horarios' });
    expect(within(panel).getByLabelText('Día')).toHaveValue('2099-10-15');
    expect(jueves.querySelector('.horario--nuevo')).toHaveTextContent('09:00Nuevo horario');
    fireEvent.change(within(panel).getByLabelText('Desde'), { target: { value: '09:30' } });
    expect(jueves.querySelector('.horario--nuevo')).toHaveTextContent('09:30Nuevo horario');

    await userEvent.click(screen.getByRole('button', { name: /^Ver las reservas del viernes 16 de octubre/ }));
    expect(screen.queryByRole('region', { name: 'Publicar horarios' })).not.toBeInTheDocument();
    expect(document.querySelector('.horario--nuevo')).toBeNull();
    expect(screen.getByText('viernes 16 de octubre')).toBeInTheDocument();
    expect(screen.getByText('No tienes reservas este día.')).toBeInTheDocument();
  });

  test('en el celular, tocar otro día también cierra el detalle', async () => {
    window.innerWidth = 375;
    simularApi({ '/api/agenda/semana': SEMANA, '/api/reservas': { reservas: [PENDIENTE] } });
    renderizarApp('/profesional/agenda');
    const dias = await screen.findByRole('group', { name: 'Día de la semana' });
    await userEvent.click(within(dias).getByRole('button', { name: /martes 13 de octubre/ }));
    await userEvent.click(screen.getByRole('button', { name: /Ana Pérez, por confirmar/ }));
    expect(screen.getByRole('region', { name: 'martes 13 de octubre' })).toBeInTheDocument();
    await userEvent.click(within(dias).getByRole('button', { name: /miércoles 14 de octubre/ }));
    expect(screen.queryByRole('region', { name: 'martes 13 de octubre' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Bruno Díaz, confirmada/ })).toBeInTheDocument();
  });
});

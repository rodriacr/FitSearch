// Reserva de una hora desde la ficha (FS-HU-14, flujo de calendario de la SC-20).
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { fichaProfesional, llamadasA, renderizarApp, SESION, simularApi } from '../../tests/utilidades.jsx';

const h = { id: 2, fecha: '2099-10-15', horaInicio: '09:00', horaFin: '10:00', ocupado: false };
const HORARIOS = [
  h,
  { id: 3, fecha: '2099-10-15', horaInicio: '11:00', horaFin: '11:30', ocupado: false },
  { id: 4, fecha: '2099-10-20', horaInicio: '09:00', horaFin: '09:45', ocupado: false },
  { id: 5, fecha: '2099-11-03', horaInicio: '10:00', horaFin: '11:00', ocupado: false },
];
const r = { id: 4, estado: 'pendiente', mensaje: 'Necesito orientación nutricional', horario: h, usuario: { id: 1, nombre: 'Ana' }, profesional: { id: 3, nombre: 'Juan' } };
const ficha = (horarios = HORARIOS) => ({
  '/api/profesionales/3/disponibilidades': { horarios },
  '/api/profesionales/3/resenas': { resenas: [], pagina: 1, total: 0, totalPaginas: 0 },
  '/api/profesionales/3': {
    profesional: fichaProfesional({ id: 3, nombre: 'Javiera Morales', especialidad: 'Nutrición', modalidad: 'ambas', comuna: 'Providencia', establecimiento: null }),
    resumenResenas: { promedio: null, total: 0, distribucion: [] }, miResena: null, puedeResenar: false,
  },
});
const seccion = () => screen.getByRole('region', { name: 'Reservar una hora' });
const dia = (nombre) => within(seccion()).getByRole('button', { name: nombre });

beforeEach(() => sessionStorage.setItem('fitsearch_sesion', JSON.stringify(SESION)));

describe('Calendario y horas', () => {
  test('marca los días con horas, elige el primero y muestra sus horas, duración y modalidad', async () => {
    simularApi(ficha());
    renderizarApp('/profesionales/3');
    expect(await screen.findByRole('heading', { name: 'octubre 2099' })).toBeInTheDocument();
    expect(dia('jueves 15 de octubre, 2 horas disponibles')).toHaveAttribute('aria-pressed', 'true');
    expect(dia('martes 20 de octubre, 1 hora disponible')).toBeEnabled();
    expect(dia('viernes 16 de octubre, sin horas disponibles')).toBeDisabled();
    const horas = within(screen.getByRole('list', { name: 'Horas del jueves 15 de octubre' }));
    expect(horas.getAllByRole('button').map((b) => b.getAttribute('aria-label'))).toEqual(['09:00 a 10:00', '11:00 a 11:30']);
    const resumen = within(screen.getByRole('complementary', { name: 'Resumen de la reserva' }));
    expect(resumen.getByText('30 min a 1 h')).toBeInTheDocument();
    expect(resumen.getByText('Presencial y online')).toBeInTheDocument();
    expect(resumen.getByText('Hora de Chile (Santiago)')).toBeInTheDocument();

    await userEvent.click(dia('martes 20 de octubre, 1 hora disponible'));
    expect(screen.getByRole('list', { name: 'Horas del martes 20 de octubre' })).toBeInTheDocument();
    expect(resumen.getByText('45 min')).toBeInTheDocument();
  });

  test('navega solo entre meses con horas y elige el primer día de cada uno', async () => {
    simularApi(ficha());
    renderizarApp('/profesionales/3');
    await screen.findByRole('heading', { name: 'octubre 2099' });
    expect(screen.getByRole('button', { name: 'Mes anterior con horas' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Mes siguiente con horas' }));
    expect(screen.getByRole('heading', { name: 'noviembre 2099' })).toBeInTheDocument();
    expect(dia('martes 3 de noviembre, 1 hora disponible')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Mes siguiente con horas' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Mes anterior con horas' }));
    expect(screen.getByRole('heading', { name: 'octubre 2099' })).toBeInTheDocument();
  });

  test('con el teclado: las flechas pasan al día con horas siguiente o anterior y solo el día elegido recibe Tab', async () => {
    simularApi(ficha());
    renderizarApp('/profesionales/3');
    const quince = await screen.findByRole('button', { name: 'jueves 15 de octubre, 2 horas disponibles' });
    expect(quince).toHaveAttribute('tabindex', '0');
    expect(dia('martes 20 de octubre, 1 hora disponible')).toHaveAttribute('tabindex', '-1');
    quince.focus();
    await userEvent.keyboard('{ArrowRight}');
    const veinte = dia('martes 20 de octubre, 1 hora disponible');
    expect(veinte).toHaveFocus();
    expect(veinte).toHaveAttribute('aria-pressed', 'true');
    await userEvent.keyboard('{ArrowLeft}');
    expect(dia('jueves 15 de octubre, 2 horas disponibles')).toHaveFocus();
  });
});

describe('Confirmar, mensaje y solicitud enviada', () => {
  test('la hora elegida muestra "Confirmar" en su fila; el mensaje es obligatorio y al enviar queda pendiente, con .ics', async () => {
    const fetch = simularApi({ ...ficha(), '/api/reservas': (_u, o) => (o.method === 'POST'
      ? [201, { reserva: { ...r, id: 9, horario: h } }] : [200, { reservas: [] }]) });
    renderizarApp('/profesionales/3');
    await userEvent.click(await screen.findByRole('button', { name: '09:00 a 10:00' }));
    const fila = screen.getByRole('button', { name: '09:00 a 10:00' }).closest('li');
    expect(screen.getByRole('button', { name: '09:00 a 10:00' })).toHaveAttribute('aria-pressed', 'true');
    // Solo la hora elegida tiene "Confirmar".
    expect(screen.getAllByRole('button', { name: /^Confirmar/ })).toHaveLength(1);
    await userEvent.click(within(fila).getByRole('button', { name: 'Confirmar 09:00 a 10:00' }));

    const campo = screen.getByLabelText('Qué necesitas consultar');
    expect(campo).toHaveFocus();
    expect(campo).toBeRequired();
    expect(campo).toHaveAttribute('minlength', '10');
    expect(screen.getByRole('complementary', { name: 'Resumen de la reserva' })).toHaveTextContent('jueves 15 de octubre, 09:00 – 10:00');
    await userEvent.type(campo, r.mensaje);
    expect(screen.getByText(/\(32\/500\)/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Enviar solicitud de reserva' }));

    const titulo = await screen.findByRole('heading', { name: 'Solicitud enviada' });
    expect(titulo).toHaveFocus();
    expect(screen.getByText('Pendiente de confirmación')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver mis citas' })).toHaveAttribute('href', '/citas');
    expect(JSON.parse(llamadasA(fetch, '/api/reservas').find(([, o]) => o.method === 'POST')[1].body))
      .toEqual({ disponibilidadId: 2, mensaje: r.mensaje });

    URL.createObjectURL = vi.fn(() => 'blob:cita');
    URL.revokeObjectURL = vi.fn();
    const clic = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    await userEvent.click(screen.getByRole('button', { name: 'Agregar al calendario' }));
    expect(clic).toHaveBeenCalledTimes(1);
    expect(clic.mock.contexts[0].download).toBe('cita-fitsearch-2099-10-15.ics');
    const archivo = URL.createObjectURL.mock.calls[0][0];
    expect(archivo.type).toBe('text/calendar;charset=utf-8');
    const texto = await archivo.text();
    expect(texto).toContain('UID:reserva-9@fitsearch');
    expect(texto).toContain('STATUS:TENTATIVE');
    expect(texto).toContain('LOCATION:Providencia u online');
  });

  test('"Cambiar hora" vuelve al calendario y conserva el mensaje escrito', async () => {
    simularApi(ficha());
    renderizarApp('/profesionales/3');
    await userEvent.click(await screen.findByRole('button', { name: '11:00 a 11:30' }));
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar 11:00 a 11:30' }));
    await userEvent.type(screen.getByLabelText('Qué necesitas consultar'), 'Quiero bajar de peso');
    await userEvent.click(screen.getByRole('button', { name: 'Cambiar hora' }));
    expect(screen.getByRole('button', { name: '11:00 a 11:30' })).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar 11:00 a 11:30' }));
    expect(screen.getByLabelText('Qué necesitas consultar')).toHaveValue('Quiero bajar de peso');
  });

  test('si otra persona tomó la hora, avisa y vuelve al calendario con las horas actualizadas', async () => {
    let horarios = [h];
    const fetch = simularApi({ ...ficha(), '/api/profesionales/3/disponibilidades': () => [200, { horarios }],
      '/api/reservas': (_u, o) => { if (o.method === 'POST') { horarios = []; return [409, { error: 'El horario ya no está disponible' }]; } return [200, { reservas: [] }]; } });
    renderizarApp('/profesionales/3');
    await userEvent.click(await screen.findByRole('button', { name: '09:00 a 10:00' }));
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar 09:00 a 10:00' }));
    await userEvent.type(screen.getByLabelText('Qué necesitas consultar'), r.mensaje);
    await userEvent.click(screen.getByRole('button', { name: 'Enviar solicitud de reserva' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('El horario ya no está disponible');
    await waitFor(() => expect(screen.getByText('Este profesional no tiene horarios disponibles por ahora.')).toBeInTheDocument());
    expect(JSON.parse(fetch.mock.calls.find(([, o]) => o.method === 'POST')[1].body)).toEqual({ disponibilidadId: 2, mensaje: r.mensaje });
  });

  test('el 409 del límite conserva la hora elegida y el mensaje en vez de tratarla como ocupada', async () => {
    simularApi({ ...ficha([h]), '/api/reservas': (_u, o) => (o.method === 'POST'
      ? [409, { error: 'Ya tienes una reserva activa con este profesional. Cancélala antes de reservar otra hora', detalles: { motivo: 'limite_por_profesional' } }]
      : [200, { reservas: [] }]) });
    renderizarApp('/profesionales/3');
    await userEvent.click(await screen.findByRole('button', { name: '09:00 a 10:00' }));
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar 09:00 a 10:00' }));
    await userEvent.type(screen.getByLabelText('Qué necesitas consultar'), r.mensaje);
    await userEvent.click(screen.getByRole('button', { name: 'Enviar solicitud de reserva' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Ya tienes una reserva activa con este profesional');
    expect(screen.getByLabelText('Qué necesitas consultar')).toHaveValue(r.mensaje);
    expect(screen.getByRole('complementary', { name: 'Resumen de la reserva' })).toHaveTextContent('jueves 15 de octubre, 09:00 – 10:00');
  });
});

// Límite del PO: una reserva activa por usuario con cada profesional.
describe('Reserva activa con el profesional', () => {
  test('con una reserva activa y futura, avisa antes y no muestra el calendario', async () => {
    simularApi({ ...ficha(), '/api/reservas': { reservas: [{ ...r, profesional: { id: 3, nombre: 'Javiera Morales' }, horario: { ...h, id: 9 } }] } });
    renderizarApp('/profesionales/3');
    const aviso = await screen.findByText(/Ya tienes una reserva pendiente con este profesional/);
    expect(within(aviso).getByRole('link', { name: 'Mis citas' })).toHaveAttribute('href', '/citas');
    expect(screen.queryByRole('heading', { name: 'octubre 2099' })).not.toBeInTheDocument();
  });

  test('una reserva pasada o cancelada con el profesional no impide reservar', async () => {
    simularApi({ ...ficha(), '/api/reservas': { reservas: [
      { ...r, id: 5, estado: 'confirmada', profesional: { id: 3, nombre: 'Javiera Morales' }, horario: { ...h, id: 7, fecha: '2020-01-01' } },
      { ...r, id: 6, estado: 'cancelada', profesional: { id: 3, nombre: 'Javiera Morales' }, horario: { ...h, id: 8 } },
    ] } });
    renderizarApp('/profesionales/3');
    expect(await screen.findByRole('heading', { name: 'octubre 2099' })).toBeInTheDocument();
    expect(screen.queryByText(/Ya tienes una reserva/)).not.toBeInTheDocument();
  });
});

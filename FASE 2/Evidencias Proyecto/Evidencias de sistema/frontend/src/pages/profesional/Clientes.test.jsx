// Clientes del profesional y su historial (FS-HU-27).
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test } from 'vitest';
import { llamadasA, renderizarApp, SESION_PROFESIONAL, simularApi } from '../../tests/utilidades.jsx';

const estados = (cambios = {}) => ({ pendientes: 0, confirmadas: 0, realizadas: 0, sinConfirmar: 0, canceladas: 0, ...cambios });
const CLIENTES = {
  clientes: [
    {
      id: 21, nombre: 'Camila Rojas', totalCitas: 3, estados: estados({ confirmadas: 1, realizadas: 1, canceladas: 1 }),
      proximaCita: { fecha: '2026-11-12', horaInicio: '09:00', horaFin: '09:45' }, ultimaCita: { fecha: '2026-10-20', horaInicio: '09:00', horaFin: '09:45' },
      primeraReserva: '2026-10-01T15:00:00.000Z',
    },
    {
      id: 22, nombre: 'Pedro Soto', totalCitas: 1, estados: estados({ realizadas: 1 }),
      proximaCita: null, ultimaCita: { fecha: '2026-11-02', horaInicio: '10:00', horaFin: '10:45' }, primeraReserva: '2026-10-28T12:00:00.000Z',
    },
  ],
  zonaHoraria: 'America/Santiago',
};
const cita = (id, fecha, estado, pasada) => ({
  id, estado, pasada, mensaje: 'Tengo una molestia en la rodilla al correr.', fechaCreacion: '2026-10-01T15:00:00.000Z',
  horario: { fecha, horaInicio: '09:00', horaFin: '09:45' },
});
const HISTORIAL = {
  cliente: CLIENTES.clientes[0],
  citas: [cita(5, '2026-11-12', 'confirmada', false), cita(3, '2026-11-10', 'cancelada', false), cita(1, '2026-10-20', 'confirmada', true)],
  zonaHoraria: 'America/Santiago',
};

beforeEach(() => sessionStorage.setItem('fitsearch_sesion', JSON.stringify(SESION_PROFESIONAL)));

describe('Lista de clientes', () => {
  test('muestra a cada persona con su cantidad de citas, la próxima y la última, sin datos de salud', async () => {
    simularApi({ '/api/profesional/clientes': CLIENTES });
    renderizarApp('/profesional/clientes');

    expect(await screen.findByRole('heading', { level: 2, name: 'Camila Rojas' })).toBeInTheDocument();
    expect(screen.getByText('2 clientes')).toBeInTheDocument();
    const camila = screen.getByRole('heading', { name: 'Camila Rojas' }).closest('li');
    expect(within(camila).getByText(/3 citas · 1 realizadas/)).toBeInTheDocument();
    expect(within(camila).getByText(/Próxima:/).closest('span')).toHaveTextContent(/12 nov 2026, 09:00/);
    expect(within(camila).getByRole('link', { name: 'Ver historial de Camila Rojas' })).toHaveAttribute('href', '/profesional/clientes/21');
    const pedro = screen.getByRole('heading', { name: 'Pedro Soto' }).closest('li');
    expect(within(pedro).getByText('Sin citas próximas')).toBeInTheDocument();
    expect(screen.queryByText(/alergia|medicamento|condición/i)).not.toBeInTheDocument();
  });

  test('filtra por nombre sin importar tildes ni mayúsculas', async () => {
    simularApi({ '/api/profesional/clientes': CLIENTES });
    renderizarApp('/profesional/clientes');
    const buscador = await screen.findByRole('searchbox', { name: 'Buscar cliente por nombre' });

    await userEvent.type(buscador, 'PEDRO');
    expect(screen.getByText('1 de 2 clientes')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Camila Rojas' })).not.toBeInTheDocument();

    await userEvent.clear(buscador);
    await userEvent.type(buscador, 'zzz');
    expect(screen.getByText(/Ningún cliente coincide/)).toBeInTheDocument();
  });

  test('sin reservas invita a publicar horarios', async () => {
    simularApi({ '/api/profesional/clientes': { clientes: [], zonaHoraria: 'America/Santiago' } });
    renderizarApp('/profesional/clientes');
    expect(await screen.findByText('Aún no tienes clientes')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Publicar horario' })).toHaveAttribute('href', '/profesional/agenda');
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
  });

  test('sin ficha profesional lleva a completarla', async () => {
    simularApi({ '/api/profesional/clientes': () => [409, { error: 'Completa tu ficha profesional para ver tus clientes y reportes' }] });
    renderizarApp('/profesional/clientes');
    expect(await screen.findByText('Completa tu ficha profesional')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Completar ficha' })).toHaveAttribute('href', '/profesional/perfil');
  });

  test('si la API falla, permite reintentar', async () => {
    let falla = true;
    const fetch = simularApi({
      '/api/profesional/clientes': () => (falla ? [500, { error: 'No pudimos cargar tus clientes' }] : [200, CLIENTES]),
    });
    renderizarApp('/profesional/clientes');
    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos cargar tus clientes');
    falla = false;
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByRole('heading', { name: 'Camila Rojas' })).toBeInTheDocument();
    expect(llamadasA(fetch, '/api/profesional/clientes').length).toBeGreaterThan(1);
  });
});

describe('Historial del cliente', () => {
  test('lista sus citas con el estado que corresponde y vuelve a Clientes', async () => {
    simularApi({ '/api/profesional/clientes/21': HISTORIAL });
    renderizarApp('/profesional/clientes/21');

    expect(await screen.findByRole('heading', { level: 1, name: 'Camila Rojas' })).toBeInTheDocument();
    expect(screen.getByText(/Cliente desde el 1 oct 2026 · 3 citas/)).toBeInTheDocument();
    const lista = screen.getByRole('heading', { name: 'Historial de citas' }).nextElementSibling;
    // Una confirmada que ya pasó se muestra como realizada.
    expect(within(lista).getAllByRole('listitem').map((item) => item.querySelector('span').textContent)).toEqual(['Confirmada', 'Cancelada', 'Realizada']);
    expect(within(lista).getAllByText('«Tengo una molestia en la rodilla al correr.»')).toHaveLength(3);
    expect(screen.getByRole('link', { name: /Volver a Clientes/ })).toHaveAttribute('href', '/profesional/clientes');
  });

  test('una persona que no es su cliente muestra un aviso, sin datos', async () => {
    simularApi({ '/api/profesional/clientes/99': () => [404, { error: 'No encontramos a esta persona entre tus clientes' }] });
    renderizarApp('/profesional/clientes/99');
    expect(await screen.findByRole('heading', { level: 1, name: 'No encontramos a este cliente' })).toBeInTheDocument();
  });
});

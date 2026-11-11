// Reportes del profesional (FS-HU-28).
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, test } from 'vitest';
import { llamadasA, parametrosDe, renderizarApp, SESION_PROFESIONAL, simularApi } from '../../tests/utilidades.jsx';

const semana = (inicio, fin, cambios = {}) => {
  const estados = { pendientes: 0, confirmadas: 0, realizadas: 0, sinConfirmar: 0, canceladas: 0, ...cambios };
  return { inicio, fin, total: Object.values(estados).reduce((a, b) => a + b, 0), ...estados };
};
const reportes = (semanas, calificacion = { promedio: 4.3, cantidad: 3 }) => ({
  semanas,
  totales: { total: 9, pendientes: 1, confirmadas: 1, realizadas: 5, sinConfirmar: 1, canceladas: 1 },
  calificacion,
  resumenSemanal: { inicio: '2026-11-09', fin: '2026-11-15', totalClientes: 4, citasRealizadas: 1, citasPendientes: 1, clientesNuevos: 1 },
  zonaHoraria: 'America/Santiago',
});
const CUATRO = [
  semana('2026-10-19', '2026-10-25', { realizadas: 2 }),
  semana('2026-10-26', '2026-11-01'),
  semana('2026-11-02', '2026-11-08', { realizadas: 1, sinConfirmar: 1 }),
  semana('2026-11-09', '2026-11-15', { realizadas: 1, confirmadas: 1, canceladas: 1 }),
];

beforeEach(() => sessionStorage.setItem('fitsearch_sesion', JSON.stringify(SESION_PROFESIONAL)));

test('muestra los indicadores del período, la calificación promedio y la tabla de reservas por semana', async () => {
  const fetch = simularApi({ '/api/profesional/reportes': reportes(CUATRO) });
  renderizarApp('/profesional/reportes');

  const indicadores = await screen.findByRole('list', { name: 'Resumen de las últimas 4 semanas' });
  const valor = (nombre) => within(indicadores).getByText(nombre).closest('li').querySelector('strong').textContent;
  expect(valor('Reservas')).toBe('7');
  expect(valor('Citas realizadas')).toBe('4');
  expect(valor('Canceladas')).toBe('1');
  expect(valor('Calificación promedio')).toBe('4,3');
  expect(within(indicadores).getByText('3 reseñas')).toBeInTheDocument();
  expect(within(indicadores).getByText('9 desde que empezaste')).toBeInTheDocument();

  const tabla = screen.getByRole('table', { name: 'Reservas por semana y por estado' });
  const filas = within(tabla).getAllByRole('row').slice(1);
  expect(filas).toHaveLength(4);
  expect(within(filas[3]).getAllByRole('cell').map((celda) => celda.textContent)).toEqual(['3', '1', '1', '0', '0', '1']);
  // Por defecto se piden 8 semanas.
  expect(parametrosDe(llamadasA(fetch, '/api/profesional/reportes')[0][0])).toEqual({ semanas: '8' });
});

test('cambia el período del reporte', async () => {
  const fetch = simularApi({ '/api/profesional/reportes': reportes(CUATRO) });
  renderizarApp('/profesional/reportes');
  await screen.findByRole('table');

  const boton = screen.getByRole('button', { name: '12 semanas' });
  await userEvent.click(boton);
  expect(boton).toHaveAttribute('aria-pressed', 'true');
  expect(parametrosDe(llamadasA(fetch, '/api/profesional/reportes').at(-1)[0])).toEqual({ semanas: '12' });
});

test('sin reservas ni reseñas lo dice, sin inventar datos', async () => {
  const vacias = CUATRO.map(({ inicio, fin }) => semana(inicio, fin));
  simularApi({ '/api/profesional/reportes': { ...reportes(vacias, { promedio: null, cantidad: 0 }), totales: { total: 0 } } });
  renderizarApp('/profesional/reportes');

  expect(await screen.findByText('Sin reservas en las últimas 4 semanas')).toBeInTheDocument();
  expect(screen.queryByRole('table')).not.toBeInTheDocument();
  const indicadores = screen.getByRole('list', { name: 'Resumen de las últimas 4 semanas' });
  expect(within(indicadores).getByText('Aún sin reseñas')).toBeInTheDocument();
  expect(within(indicadores).getByText('—')).toBeInTheDocument();
});

test('sin ficha profesional lleva a completarla', async () => {
  simularApi({ '/api/profesional/reportes': () => [409, { error: 'Completa tu ficha profesional para ver tus clientes y reportes' }] });
  renderizarApp('/profesional/reportes');
  expect(await screen.findByRole('link', { name: 'Completar ficha' })).toHaveAttribute('href', '/profesional/perfil');
});

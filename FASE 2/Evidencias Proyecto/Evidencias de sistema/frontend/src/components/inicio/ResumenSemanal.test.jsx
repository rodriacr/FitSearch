// Resumen semanal del Inicio (25-11-2026): gráfico de la semana, indicadores, comparación con la semana anterior, agua y
// qué pasa si la API falla.
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, test } from 'vitest';
import ResumenSemanal from './ResumenSemanal.jsx';
import { SESION, simularApi } from '../../tests/utilidades.jsx';

beforeEach(() => sessionStorage.setItem('fitsearch_sesion', JSON.stringify(SESION)));

const FECHAS = ['2026-11-23', '2026-11-24', '2026-11-25', '2026-11-26', '2026-11-27', '2026-11-28', '2026-11-29'];
const HOY = '2026-11-25';
function estadisticas({ calorias = [2000, 1500, 2600, 0, 0, 0, 0], meta = 2000, anterior = 1900, diasCerca = 1 } = {}) {
  const dias = FECHAS.map((fecha, i) => ({ fecha, calorias: calorias[i], conRegistros: calorias[i] > 0, futuro: fecha > HOY }));
  const conRegistros = dias.filter((d) => d.conRegistros);
  return {
    periodo: 'semana', desde: FECHAS[0], hasta: FECHAS[6], hoy: HOY, objetivo: { calorias: meta }, dias,
    diasConRegistros: conRegistros.length, diasCerca: meta ? diasCerca : null,
    promedio: conRegistros.length ? { calorias: 2000 } : null,
    anterior: { promedio: anterior ? { calorias: anterior } : null },
  };
}
const agua = (totales = [2250, 750, 2000, 0, 0, 0, 0]) => ({
  desde: FECHAS[0], hasta: FECHAS[6], hoy: HOY, metaMl: 2000, totalMl: totales.reduce((a, b) => a + b, 0),
  diasConMeta: totales.filter((ml) => ml >= 2000).length, dias: FECHAS.map((fecha, i) => ({ fecha, totalMl: totales[i], futuro: fecha > HOY })),
});
function mostrar(respuestas) {
  simularApi(respuestas);
  return render(<MemoryRouter><ResumenSemanal /></MemoryRouter>);
}
const indicador = (nombre) => screen.getByText(nombre).closest('li');

describe('Resumen semanal', () => {
  test('muestra la semana con sus indicadores, la comparación y el agua', async () => {
    mostrar({ '/api/comidas/estadisticas': estadisticas(), '/api/agua/semana': agua() });
    expect(await screen.findByRole('heading', { name: 'Tu semana' })).toBeInTheDocument();
    expect(screen.getByText('Del 23 al 29 de noviembre')).toBeInTheDocument();
    expect(indicador('Días con registro')).toHaveTextContent('3 / 7');
    expect(indicador('Cerca de tu meta')).toHaveTextContent('1 día');
    expect(indicador('Promedio diario')).toHaveTextContent('2.000 kcal');
    expect(indicador('Promedio diario')).toHaveTextContent('5 % más que la semana anterior');
    expect(indicador('Agua de la semana')).toHaveTextContent('5 L');
    expect(indicador('Agua de la semana')).toHaveTextContent('2 días con la meta de agua');
    expect(screen.getByText(/Vas bien: 3 días con registro/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Ver estadísticas/ })).toHaveAttribute('href', '/comidas?seccion=estadisticas');
  });

  test('el gráfico marca cada día según la meta, el día de hoy y los que aún no llegan', async () => {
    const { container } = mostrar({ '/api/comidas/estadisticas': estadisticas(), '/api/agua/semana': agua() });
    await screen.findByRole('heading', { name: 'Tu semana' });
    const grafico = screen.getByRole('img', { name: /Calorías de la semana/ });
    expect(grafico).toHaveAccessibleName(expect.stringContaining('Lun 2.000 kcal, Mar 1.500 kcal, Mié 2.600 kcal, Jue aún no llega'));
    const barras = [...container.querySelectorAll('.semana__barra')].map((b) => b.className.split('--')[1]);
    expect(barras).toEqual(['meta', 'bajo', 'sobre']);
    expect(container.querySelector('.semana__dia--hoy')).toHaveTextContent('Mié');
    expect(container.querySelectorAll('.semana__dia--futuro')).toHaveLength(4);
    expect(container.querySelectorAll('.semana__gota--meta')).toHaveLength(2);
  });

  test('una semana con pocos días invita a seguir, y una buena semana felicita', async () => {
    const { unmount } = mostrar({ '/api/comidas/estadisticas': estadisticas({ calorias: [0, 0, 0, 0, 0, 0, 0], anterior: null }), '/api/agua/semana': agua() });
    expect(await screen.findByText(/Aún no registras comidas esta semana/)).toBeInTheDocument();
    expect(indicador('Promedio diario')).toHaveTextContent('Sin datos de la semana anterior');
    unmount();
    mostrar({ '/api/comidas/estadisticas': estadisticas({ calorias: [1900, 2000, 2100, 2050, 1950, 0, 0] }), '/api/agua/semana': agua() });
    expect(await screen.findByText(/¡Gran semana! Registraste 5 de 7 días/)).toBeInTheDocument();
  });

  test('sin meta de calorías pide completar el perfil y no dibuja la línea de la meta', async () => {
    const { container } = mostrar({ '/api/comidas/estadisticas': estadisticas({ meta: null }), '/api/agua/semana': agua() });
    await screen.findByRole('heading', { name: 'Tu semana' });
    expect(screen.getByRole('link', { name: 'Completa tu perfil' })).toHaveAttribute('href', '/perfil');
    expect(container.querySelector('.semana__columnas--con-meta')).toBeNull();
  });

  test('si falla el agua se muestra sin ella; si fallan las estadísticas, la tarjeta no aparece', async () => {
    const { container, unmount } = mostrar({ '/api/comidas/estadisticas': estadisticas(), '/api/agua/semana': () => [500, { error: 'Error interno' }] });
    await screen.findByRole('heading', { name: 'Tu semana' });
    expect(screen.queryByText('Agua de la semana')).not.toBeInTheDocument();
    expect(container.querySelector('.semana__gota')).toBeNull();
    unmount();
    const otra = mostrar({ '/api/comidas/estadisticas': () => [500, { error: 'Error interno' }], '/api/agua/semana': agua() });
    await waitFor(() => expect(otra.container.querySelector('.resumen-semanal')).toBeNull());
  });
});

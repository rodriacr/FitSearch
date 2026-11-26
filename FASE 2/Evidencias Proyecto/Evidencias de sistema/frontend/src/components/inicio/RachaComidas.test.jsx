// Racha de comidas del Inicio (25-11-2026): días seguidos, aviso si hoy falta registrar, hitos, tope y errores de la API.
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, test } from 'vitest';
import RachaComidas from './RachaComidas.jsx';
import { SESION, simularApi } from '../../tests/utilidades.jsx';

beforeEach(() => sessionStorage.setItem('fitsearch_sesion', JSON.stringify(SESION)));

const mostrar = (respuesta) => {
  simularApi({ '/api/comidas/racha': respuesta });
  return render(<MemoryRouter><ul><RachaComidas /></ul></MemoryRouter>);
};
const valor = () => document.querySelector('.progreso__racha .progreso__valor');

describe('Racha de comidas', () => {
  test('muestra los días seguidos y felicita si hoy ya registró', async () => {
    mostrar({ dias: 5, registradoHoy: true, diasMaximos: 365 });
    await waitFor(() => expect(valor()).toHaveTextContent('5 días seguidos'));
    expect(screen.getByText('Ya registraste hoy. ¡Sigue así!')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Registrar comida' })).not.toBeInTheDocument();
  });

  test('avisa que hoy falta registrar para mantener la racha', async () => {
    mostrar({ dias: 1, registradoHoy: false, diasMaximos: 365 });
    await waitFor(() => expect(valor()).toHaveTextContent('1 día seguido'));
    expect(screen.getByText('Registra una comida hoy para mantenerla.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Registrar comida' })).toHaveAttribute('href', '/comidas');
  });

  test('sin racha invita a empezarla', async () => {
    mostrar({ dias: 0, registradoHoy: false, diasMaximos: 365 });
    expect(await screen.findByText('Registra una comida hoy para empezar tu racha.')).toBeInTheDocument();
    expect(valor()).toHaveTextContent('0 días seguidos');
  });

  test('celebra los hitos y marca el tope de días', async () => {
    const { unmount } = mostrar({ dias: 7, registradoHoy: true, diasMaximos: 365 });
    expect(await screen.findByText('¡Una semana completa registrando!')).toBeInTheDocument();
    unmount();
    mostrar({ dias: 365, registradoHoy: true, diasMaximos: 365 });
    await waitFor(() => expect(valor()).toHaveTextContent('365+ días seguidos'));
  });

  test('si la API falla o responde otra cosa, no muestra la fila', async () => {
    const { container, unmount } = mostrar(() => [500, { error: 'Error interno' }]);
    await waitFor(() => expect(container.querySelector('.progreso__racha')).toBeNull());
    unmount();
    const otra = mostrar({ fecha: '2026-11-25' });
    await waitFor(() => expect(otra.container.querySelector('.progreso__racha')).toBeNull());
  });
});

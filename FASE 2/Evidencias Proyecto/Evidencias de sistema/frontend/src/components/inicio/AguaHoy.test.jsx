// «Agua hoy» del Inicio (FS-HU-33): sumar vasos o mililitros, cantidades no válidas, deshacer y errores de la API.
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import AguaHoy from './AguaHoy.jsx';
import { hoyEnChile } from '../../services/agua.service.js';
import { llamadasA, SESION, simularApi } from '../../tests/utilidades.jsx';

beforeEach(() => sessionStorage.setItem('fitsearch_sesion', JSON.stringify(SESION)));

// La fecha es la de hoy en Chile: «Deshacer» solo actúa sobre el día que sigue siendo hoy.
const dia = (registros) => ({
  fecha: hoyEnChile(), totalMl: registros.reduce((suma, { ml }) => suma + ml, 0), metaMl: 2000, vasoMl: 250,
  registros: registros.map((r, i) => ({ id: i + 1, hora: '10:00', ...r })),
});

// Servidor simulado con estado: GET devuelve el día, POST suma y DELETE quita la suma indicada.
function simularAgua(inicial = [], { errorAlSumar } = {}) {
  let registros = inicial.map((r, i) => ({ id: i + 1, ...r }));
  return simularApi({
    '/api/agua': (url, { method = 'GET', body } = {}) => {
      if (method === 'POST') {
        if (errorAlSumar) return [400, { error: errorAlSumar }];
        registros = [...registros, { id: registros.length + 1, ml: JSON.parse(body).ml }];
        return [201, dia(registros)];
      }
      if (method === 'DELETE') {
        const id = Number(url.split('/').at(-1));
        registros = registros.filter((r) => r.id !== id);
        return [200, dia(registros)];
      }
      return [200, dia(registros)];
    },
  });
}
const valor = () => document.querySelector('.agua-hoy .progreso__valor');
const cuerposPost = (fetch) => llamadasA(fetch, '/api/agua').filter(([, o]) => o?.method === 'POST').map(([, o]) => JSON.parse(o.body));

describe('Agua hoy', () => {
  test('muestra el agua de hoy frente a la meta', async () => {
    simularAgua([{ ml: 750 }]);
    render(<AguaHoy />);
    await waitFor(() => expect(valor()).toHaveTextContent('750 / 2.000 ml'));
    expect(screen.queryByText('Llegaste a la meta de hoy')).not.toBeInTheDocument();
  });

  test('«1 vaso» suma 250 ml y actualiza el avance', async () => {
    const fetch = simularAgua([{ ml: 750 }]);
    render(<AguaHoy />);
    await userEvent.click(await screen.findByRole('button', { name: 'Sumar 1 vaso de 250 ml' }));
    await waitFor(() => expect(valor()).toHaveTextContent('1.000 / 2.000 ml'));
    expect(cuerposPost(fetch)).toEqual([{ ml: 250 }]);
    expect(screen.getByRole('status')).toHaveTextContent('Sumaste 250 ml.');
  });

  test('«Otra cantidad» suma los mililitros escritos', async () => {
    const fetch = simularAgua();
    render(<AguaHoy />);
    await userEvent.click(await screen.findByRole('button', { name: 'Otra cantidad' }));
    await userEvent.type(screen.getByLabelText('Mililitros'), '330');
    await userEvent.click(screen.getByRole('button', { name: 'Sumar' }));
    await waitFor(() => expect(valor()).toHaveTextContent('330 / 2.000 ml'));
    expect(cuerposPost(fetch)).toEqual([{ ml: 330 }]);
    // El formulario se cierra después de sumar.
    expect(screen.queryByLabelText('Mililitros')).not.toBeInTheDocument();
  });

  test.each([['vacía', ''], ['negativa', '-200'], ['muy alta', '5000'], ['con decimales', '250,5'], ['muy baja', '10']])(
    'una cantidad %s no se envía e indica el rango permitido', async (_caso, texto) => {
      const fetch = simularAgua();
      render(<AguaHoy />);
      await userEvent.click(await screen.findByRole('button', { name: 'Otra cantidad' }));
      if (texto) await userEvent.type(screen.getByLabelText('Mililitros'), texto);
      await userEvent.click(screen.getByRole('button', { name: 'Sumar' }));
      expect(screen.getByRole('alert')).toHaveTextContent('Indica entre 50 y 2.000 ml');
      expect(screen.getByLabelText('Mililitros')).toHaveAttribute('aria-invalid', 'true');
      expect(cuerposPost(fetch)).toEqual([]);
    },
  );

  test('«Deshacer» quita la última suma', async () => {
    const fetch = simularAgua([{ ml: 500 }, { ml: 250 }]);
    render(<AguaHoy />);
    await userEvent.click(await screen.findByRole('button', { name: 'Deshacer la última suma de 250 ml' }));
    await waitFor(() => expect(valor()).toHaveTextContent('500 / 2.000 ml'));
    expect(llamadasA(fetch, '/api/agua/2').map(([, o]) => o.method)).toEqual(['DELETE']);
  });

  test('al llegar a la meta lo celebra y la barra queda completa', async () => {
    simularAgua([{ ml: 2000 }, { ml: 250 }]);
    render(<AguaHoy />);
    expect(await screen.findByText('Llegaste a la meta de hoy')).toBeInTheDocument();
    expect(document.querySelector('.agua-hoy__barra > span')).toHaveStyle({ transform: 'scaleX(1)' });
  });

  test('si la API no acepta la suma, muestra su aviso', async () => {
    simularAgua([{ ml: 9900 }], { errorAlSumar: 'Hoy puedes sumar hasta 100 ml más (el máximo es 10.000 ml al día)' });
    render(<AguaHoy />);
    await userEvent.click(await screen.findByRole('button', { name: 'Sumar 1 vaso de 250 ml' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Hoy puedes sumar hasta 100 ml más');
    expect(valor()).toHaveTextContent('9.900 / 2.000 ml');
  });

  test('si no carga, lo dice y permite reintentar', async () => {
    let fallar = true;
    simularApi({ '/api/agua': () => (fallar ? [500, { error: 'Ocurrió un error inesperado' }] : [200, dia([{ ml: 250 }])]) });
    render(<AguaHoy />);
    expect(await screen.findByText(/No pudimos cargar el agua de hoy/)).toBeInTheDocument();
    fallar = false;
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    await waitFor(() => expect(valor()).toHaveTextContent('250 / 2.000 ml'));
  });
});

// Revisión del PR #48: con el Inicio abierto al pasar la medianoche, «Agua hoy» pasa al día nuevo sin recargar la página.
describe('Agua hoy al pasar la medianoche', () => {
  afterEach(() => vi.useRealTimers());

  test('a las 00:00 de Chile muestra el día nuevo y ya no ofrece deshacer las sumas de ayer', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    // 02:59:30 UTC del 05-11 son las 23:59:30 del 04-11 en Santiago (UTC-3).
    vi.setSystemTime(new Date('2026-11-05T02:59:30Z'));
    const fetch = simularApi({
      '/api/agua': () => {
        const fecha = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(new Date());
        return [200, fecha === '2026-11-04'
          ? { fecha, hoy: fecha, totalMl: 750, metaMl: 2000, vasoMl: 250, registros: [{ id: 1, ml: 750, hora: '20:00' }] }
          : { fecha, hoy: fecha, totalMl: 0, metaMl: 2000, vasoMl: 250, registros: [] }];
      },
    });
    render(<AguaHoy />);
    await waitFor(() => expect(valor()).toHaveTextContent('750 / 2.000 ml'));
    expect(screen.getByRole('button', { name: 'Deshacer la última suma de 750 ml' })).toBeInTheDocument();

    await vi.advanceTimersByTimeAsync(61000);
    await waitFor(() => expect(valor()).toHaveTextContent('0 / 2.000 ml'));
    expect(screen.queryByRole('button', { name: /Deshacer/ })).not.toBeInTheDocument();
    expect(llamadasA(fetch, '/api/agua').filter(([, o]) => (o?.method ?? 'GET') === 'GET')).toHaveLength(2);
  });
});

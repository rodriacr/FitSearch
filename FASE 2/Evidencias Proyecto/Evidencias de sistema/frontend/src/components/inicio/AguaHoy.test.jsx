// «Agua hoy» del Inicio (FS-HU-33): sumar vasos o mililitros, cantidades no válidas, deshacer y errores de la API.
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test } from 'vitest';
import AguaHoy from './AguaHoy.jsx';
import { llamadasA, SESION, simularApi } from '../../tests/utilidades.jsx';

beforeEach(() => sessionStorage.setItem('fitsearch_sesion', JSON.stringify(SESION)));

const dia = (registros) => ({
  fecha: '2026-11-04', totalMl: registros.reduce((suma, { ml }) => suma + ml, 0), metaMl: 2000, vasoMl: 250,
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

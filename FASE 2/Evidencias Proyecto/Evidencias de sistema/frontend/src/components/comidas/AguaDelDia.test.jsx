// Agua del día en el Resumen nutricional de Comidas (FS-HU-33).
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test } from 'vitest';
import AguaDelDia from './AguaDelDia.jsx';
import { llamadasA, SESION, simularApi } from '../../tests/utilidades.jsx';

beforeEach(() => sessionStorage.setItem('fitsearch_sesion', JSON.stringify(SESION)));

const respuesta = (fecha, totalMl) => ({ fecha, hoy: '2026-11-04', totalMl, metaMl: 2000, vasoMl: 250, registros: [] });

describe('Agua en el Resumen nutricional', () => {
  test('muestra el agua del día elegido frente a la meta, con la barra de los nutrientes', async () => {
    const fetch = simularApi({ '/api/agua': (url) => [200, respuesta(new URL(url, 'http://x').searchParams.get('fecha'), 750)] });
    render(<AguaDelDia fecha="2026-11-02" />);
    const barra = await screen.findByRole('progressbar', { name: 'Agua' });
    expect(barra).toHaveAttribute('aria-valuetext', '38 % del objetivo');
    expect(screen.getByText('Agua').closest('.barra-nutriente')).toHaveTextContent('750 / 2.000 ml');
    expect(llamadasA(fetch, '/api/agua')[0][0]).toBe('/api/agua?fecha=2026-11-02');
  });

  test('al recargar el día (versión nueva) vuelve a pedir el agua', async () => {
    let total = 250;
    const fetch = simularApi({ '/api/agua': () => [200, respuesta('2026-11-04', total)] });
    const { rerender } = render(<AguaDelDia fecha="2026-11-04" version={0} />);
    await waitFor(() => expect(screen.getByText('Agua').closest('.barra-nutriente')).toHaveTextContent('250 / 2.000 ml'));
    total = 500;
    rerender(<AguaDelDia fecha="2026-11-04" version={1} />);
    await waitFor(() => expect(screen.getByText('Agua').closest('.barra-nutriente')).toHaveTextContent('500 / 2.000 ml'));
    expect(llamadasA(fetch, '/api/agua')).toHaveLength(2);
  });

  test('si no carga, lo indica sin romper el resumen', async () => {
    simularApi({ '/api/agua': () => [500, { error: 'Ocurrió un error inesperado' }] });
    render(<AguaDelDia fecha="2026-11-04" />);
    expect(await screen.findByText('No pudimos cargar el agua de este día.')).toBeInTheDocument();
  });
});

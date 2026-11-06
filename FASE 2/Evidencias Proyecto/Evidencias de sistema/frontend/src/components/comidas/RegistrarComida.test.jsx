// Registrar comida (FS-HU-09 y FS-HU-10) con el agua como si fuera un alimento (FS-HU-33): se busca «agua», se indican
// los mililitros y se guarda en el registro de agua del día, el mismo que muestra «Agua hoy» en el Inicio.
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import RegistrarComida from './RegistrarComida.jsx';
import { llamadasA, SESION, simularApi } from '../../tests/utilidades.jsx';

beforeEach(() => sessionStorage.setItem('fitsearch_sesion', JSON.stringify(SESION)));

const ARROZ = { id: 17, nombre: 'Arroz blanco cocido', calorias: 130, proteinasG: 2.7, carbohidratosG: 28.2, grasasG: 0.3 };
const HOY = '2026-11-04';

function simular({ hoy = HOY, totalPrevio = 500 } = {}) {
  return simularApi({
    '/api/comidas/alimentos': (url) => [200, { alimentos: url.includes('arroz') ? [ARROZ] : [] }],
    '/api/agua': (_url, { body }) => {
      const { ml, fecha } = JSON.parse(body);
      return [201, { fecha, hoy, totalMl: totalPrevio + ml, metaMl: 2000, vasoMl: 250, registros: [] }];
    },
  });
}
const cuerposA = (fetch, ruta) => llamadasA(fetch, ruta).filter(([url, o]) => url === ruta && o?.method === 'POST').map(([, o]) => JSON.parse(o.body));
const abrir = (props = {}) => {
  const alGuardar = vi.fn();
  render(<RegistrarComida fecha={HOY} alGuardar={alGuardar} alCerrar={() => {}} {...props} />);
  return alGuardar;
};

describe('Agua en el registro de comidas', () => {
  test('al buscar «agua» aparece primero, aunque no esté en el catálogo', async () => {
    simular();
    abrir();
    await userEvent.type(screen.getByLabelText('Alimento'), 'vaso de agua');
    expect(await screen.findByRole('button', { name: /^Agua/ })).toBeInTheDocument();
    expect(screen.getByText('Se suma a tu agua del día, en ml')).toBeInTheDocument();
    // No se muestra «No encontramos…» aunque el catálogo no tenga agua.
    await waitFor(() => expect(screen.queryByText(/No encontramos/)).not.toBeInTheDocument());
  });

  test('elegida el agua, se piden mililitros sin momento del día y se guarda en el agua del día elegido', async () => {
    const fetch = simular();
    const alGuardar = abrir();
    await userEvent.type(screen.getByLabelText('Alimento'), 'agua');
    await userEvent.click(await screen.findByRole('button', { name: /^Agua/ }));

    expect(screen.queryByLabelText('Momento del día')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Mililitros')).toHaveValue('250');
    expect(screen.getByText(/250 ml se suman a tu agua del día\. El agua no aporta calorías\./)).toBeInTheDocument();
    await userEvent.clear(screen.getByLabelText('Mililitros'));
    await userEvent.type(screen.getByLabelText('Mililitros'), '330');
    await userEvent.click(screen.getByRole('button', { name: 'Agregar agua' }));

    expect(await screen.findByText('Agregaste 330 ml de agua; hoy llevas 830 ml.')).toBeInTheDocument();
    expect(cuerposA(fetch, '/api/agua')).toEqual([{ ml: 330, fecha: HOY }]);
    // No es una comida: no se registra en /api/comidas ni cambia las calorías del día. La página recarga el día para
    // que el Resumen nutricional muestre el agua nueva.
    expect(cuerposA(fetch, '/api/comidas')).toEqual([]);
    expect(alGuardar).toHaveBeenCalledTimes(1);
    // El panel queda listo para otro alimento, con gramos y momento del día otra vez.
    expect(screen.getByLabelText('Alimento')).toHaveValue('');
    expect(screen.getByLabelText('Gramos')).toHaveValue('100');
    expect(screen.getByLabelText('Momento del día')).toBeInTheDocument();
  });

  test('en un día anterior se suma a ese día, sin hablar de «hoy»', async () => {
    const fetch = simular();
    abrir({ fecha: '2026-11-02' });
    await userEvent.type(screen.getByLabelText('Alimento'), 'agua');
    await userEvent.click(await screen.findByRole('button', { name: /^Agua/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Agregar agua' }));
    expect(await screen.findByText('Agregaste 250 ml de agua.')).toBeInTheDocument();
    expect(cuerposA(fetch, '/api/agua')).toEqual([{ ml: 250, fecha: '2026-11-02' }]);
  });

  test.each([['muy alta', '5000'], ['con decimales', '250,5'], ['vacía', '']])(
    'una cantidad %s no se envía e indica el rango', async (_caso, texto) => {
      const fetch = simular();
      abrir();
      await userEvent.type(screen.getByLabelText('Alimento'), 'agua');
      await userEvent.click(await screen.findByRole('button', { name: /^Agua/ }));
      await userEvent.clear(screen.getByLabelText('Mililitros'));
      if (texto) await userEvent.type(screen.getByLabelText('Mililitros'), texto);
      await userEvent.click(screen.getByRole('button', { name: 'Agregar agua' }));
      expect(screen.getByText('Indica entre 50 y 2.000 ml.')).toBeInTheDocument();
      expect(cuerposA(fetch, '/api/agua')).toEqual([]);
    },
  );

  test('«Cambiar» vuelve a los alimentos con gramos', async () => {
    simular();
    abrir();
    await userEvent.type(screen.getByLabelText('Alimento'), 'agua');
    await userEvent.click(await screen.findByRole('button', { name: /^Agua/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Cambiar' }));
    expect(screen.getByLabelText('Gramos')).toHaveValue('100');
    expect(screen.getByLabelText('Momento del día')).toBeInTheDocument();
  });

  test('los alimentos del catálogo siguen igual y no ofrecen agua', async () => {
    simular();
    abrir();
    await userEvent.type(screen.getByLabelText('Alimento'), 'arroz');
    expect(await screen.findByRole('button', { name: /Arroz blanco cocido/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Agua/ })).not.toBeInTheDocument();
  });
});

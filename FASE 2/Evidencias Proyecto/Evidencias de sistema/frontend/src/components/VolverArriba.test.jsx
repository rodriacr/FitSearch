import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { expect, test, vi } from 'vitest';
import VolverArriba from './VolverArriba.jsx';

function Navegacion() {
  const navegar = useNavigate();
  return (
    <>
      <button type="button" onClick={() => navegar('/ficha')}>Otra pantalla</button>
      <button type="button" onClick={() => navegar('/ficha?pagina=2')}>Otra página del listado</button>
      <button type="button" onClick={() => navegar(-1)}>Atrás</button>
    </>
  );
}

test('al entrar a otra pantalla vuelve arriba; los cambios de ?… y el botón atrás no mueven la vista', async () => {
  const subir = vi.spyOn(window, 'scrollTo');
  render(
    <MemoryRouter initialEntries={['/profesionales']}>
      <VolverArriba />
      <Navegacion />
    </MemoryRouter>,
  );
  expect(subir).not.toHaveBeenCalled();

  await userEvent.click(screen.getByRole('button', { name: 'Otra pantalla' }));
  expect(subir).toHaveBeenCalledTimes(1);
  expect(subir).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'instant' });

  await userEvent.click(screen.getByRole('button', { name: 'Otra página del listado' }));
  expect(subir).toHaveBeenCalledTimes(1);

  await userEvent.click(screen.getByRole('button', { name: 'Atrás' }));
  await userEvent.click(screen.getByRole('button', { name: 'Atrás' }));
  expect(subir).toHaveBeenCalledTimes(1);
});

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { expect, test } from 'vitest';
import { fichaProfesional, simularApi } from '../../tests/utilidades.jsx';
import TarjetaProfesional from './TarjetaProfesional.jsx';

test.each(['completa', 'destacado'])('muestra la insignia en la tarjeta %s solo si la API lo confirma', (variante) => {
  const vista = (verificado) => (
    <MemoryRouter><TarjetaProfesional profesional={fichaProfesional({ verificado })} variante={variante} /></MemoryRouter>
  );
  const { rerender } = render(vista(true));
  expect(screen.getByText('Verificado')).toBeInTheDocument();
  rerender(vista(false));
  expect(screen.queryByText('Verificado')).not.toBeInTheDocument();
});

test('el corazón late una vez cada vez que se marca el favorito: no al cargarlo ya marcado ni al quitarlo', async () => {
  simularApi({ '/api/favoritos/': (_url, { method }) => [200, { profesionalId: 1, esFavorito: method === 'PUT' }] });
  render(<MemoryRouter><TarjetaProfesional profesional={fichaProfesional()} /></MemoryRouter>);
  const corazon = screen.getByRole('button', { name: 'Guardar a Ana Demo en favoritos' });
  const iconoInicial = corazon.querySelector('svg');
  expect(iconoInicial).not.toHaveClass('boton-favorito__latido');

  await userEvent.click(corazon);
  expect(corazon).toHaveAttribute('aria-pressed', 'true');
  const iconoMarcado = corazon.querySelector('svg');
  // Ícono nuevo (se vuelve a montar) con la clase de la animación: el navegador la reproduce una vez.
  expect(iconoMarcado).not.toBe(iconoInicial);
  expect(iconoMarcado).toHaveClass('boton-favorito__latido');

  await userEvent.click(corazon);
  expect(corazon).toHaveAttribute('aria-pressed', 'false');
  // Al quitarlo es el mismo ícono: la animación no se repite.
  expect(corazon.querySelector('svg')).toBe(iconoMarcado);
});

test('una tarjeta que ya llega como favorita no hace latir el corazón', () => {
  render(<MemoryRouter><TarjetaProfesional profesional={fichaProfesional({ esFavorito: true })} /></MemoryRouter>);
  const corazon = screen.getByRole('button', { name: 'Guardar a Ana Demo en favoritos', pressed: true });
  expect(corazon.querySelector('svg')).not.toHaveClass('boton-favorito__latido');
});

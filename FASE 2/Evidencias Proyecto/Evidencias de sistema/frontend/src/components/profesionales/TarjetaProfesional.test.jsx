import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { expect, test } from 'vitest';
import { fichaProfesional } from '../../tests/utilidades.jsx';
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

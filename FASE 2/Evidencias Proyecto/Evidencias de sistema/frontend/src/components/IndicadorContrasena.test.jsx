import { render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import IndicadorContrasena, { evaluarContrasena } from './IndicadorContrasena.jsx';

test('el nivel sube con los requisitos y es débil mientras no llega al largo mínimo', () => {
  expect(evaluarContrasena('abc12').nivel).toBe('debil');
  expect(evaluarContrasena('abcdefgh').nivel).toBe('debil');
  expect(evaluarContrasena('abcdefg1').nivel).toBe('media');
  expect(evaluarContrasena('abcdef1!').nivel).toBe('fuerte');
});

test('muestra la seguridad y marca los requisitos cumplidos', () => {
  render(<IndicadorContrasena password="abcdefg1" />);
  expect(screen.getByText('Seguridad: media')).toBeInTheDocument();
  const requisitos = screen.getAllByRole('listitem').map((item) => item.textContent);
  expect(requisitos).toEqual(['Al menos 8 caracteres: cumple', 'Una letra y un número: cumple', 'Un símbolo (opcional): pendiente']);
});

test('no muestra nada sin contraseña', () => {
  const { container } = render(<IndicadorContrasena password="" />);
  expect(container).toBeEmptyDOMElement();
});

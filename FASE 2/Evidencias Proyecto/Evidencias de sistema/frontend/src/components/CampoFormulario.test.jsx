import { fireEvent, render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import CampoFormulario from './CampoFormulario.jsx';

const conMayusculas = (activo) => ({ key: 'a', modifierCapsLock: activo });

test('avisa cuando Bloq Mayús está activado en una contraseña y deja de hacerlo al desactivarlo o salir', () => {
  render(<CampoFormulario id="password" etiqueta="Contraseña" type="password" value="" onChange={() => {}} />);
  const campo = screen.getByLabelText('Contraseña');

  fireEvent.keyUp(campo, conMayusculas(true));
  expect(screen.getByRole('status')).toHaveTextContent('Bloq Mayús está activado');
  fireEvent.keyUp(campo, conMayusculas(false));
  expect(screen.queryByRole('status')).not.toBeInTheDocument();

  fireEvent.keyDown(campo, conMayusculas(true));
  fireEvent.blur(campo);
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
});

test('no revisa Bloq Mayús en campos que no son contraseña', () => {
  render(<CampoFormulario id="correo" etiqueta="Correo" type="email" value="" onChange={() => {}} />);
  fireEvent.keyUp(screen.getByLabelText('Correo'), conMayusculas(true));
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
});

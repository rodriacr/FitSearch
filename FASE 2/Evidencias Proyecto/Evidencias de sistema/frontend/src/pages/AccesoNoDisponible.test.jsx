import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test } from 'vitest';
import { renderizarApp, SESION, simularApi } from '../tests/utilidades.jsx';

test.each(['/', '/inicio', '/profesional/perfil'])('una cuenta administrativa en %s tiene una salida sin redirecciones repetidas', async (ruta) => {
  sessionStorage.setItem('fitsearch_sesion', JSON.stringify({
    ...SESION, usuario: { ...SESION.usuario, rol: 'administrador', rolConfirmado: true },
  }));
  simularApi({ '/api/auth/logout': () => [204, null] });
  renderizarApp(ruta);
  expect(await screen.findByRole('heading', { name: 'Acceso no disponible' })).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }));
  expect(await screen.findByText('Cerraste sesión correctamente.')).toBeInTheDocument();
  expect(sessionStorage.getItem('fitsearch_sesion')).toBeNull();
});

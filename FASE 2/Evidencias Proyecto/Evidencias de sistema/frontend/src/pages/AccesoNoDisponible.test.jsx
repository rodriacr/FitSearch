import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test } from 'vitest';
import { CLIMA, renderizarApp, respuestaPerfil, SESION, simularApi } from '../tests/utilidades.jsx';

test.each(['/', '/inicio', '/profesional/perfil'])('una cuenta administrativa en %s tiene una salida sin redirecciones repetidas', async (ruta) => {
  sessionStorage.setItem('fitsearch_sesion', JSON.stringify({
    ...SESION, usuario: { ...SESION.usuario, rol: 'administrador', rolConfirmado: true },
  }));
  simularApi({ '/api/auth/logout': () => [204, null], '/api/administrador/resumen': { usuarios: 0, profesionales: 0, pendientes: 0, verificados: 0, nuevosUsuarios: 0, nuevosProfesionales: 0, registros: [] } });
  renderizarApp(ruta);
  expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }));
  expect(await screen.findByText('Cerraste sesión correctamente.')).toBeInTheDocument();
  expect(sessionStorage.getItem('fitsearch_sesion')).toBeNull();
});

test.each([
  ['usuario', 'Tu salud y bienestar, en un solo lugar'],
  ['profesional', '¡Hola, Ana!'],
])('el rol %s sale del aviso hacia su propio Inicio', async (rol, titulo) => {
  sessionStorage.setItem('fitsearch_sesion', JSON.stringify({
    ...SESION, usuario: { ...SESION.usuario, rol, rolConfirmado: true },
  }));
  simularApi({
    '/api/perfil': respuestaPerfil(),
    '/api/profesionales': { profesionales: [], pagina: 1, total: 0, totalPaginas: 0, hayMas: false },
    '/api/profesionales/mi-ficha': { ficha: null },
    '/api/clima': CLIMA,
  });
  renderizarApp('/acceso-no-disponible');
  expect(await screen.findByRole('heading', { level: 1, name: titulo })).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'Acceso no disponible' })).not.toBeInTheDocument();
});

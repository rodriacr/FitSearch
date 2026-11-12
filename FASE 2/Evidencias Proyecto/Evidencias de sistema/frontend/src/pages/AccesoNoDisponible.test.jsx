import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test } from 'vitest';
import { CLIMA, renderizarApp, respuestaPerfil, SESION, simularApi } from '../tests/utilidades.jsx';

test.each(['/', '/inicio', '/profesional/perfil'])('una cuenta administrativa en %s tiene una salida sin redirecciones repetidas', async (ruta) => {
  sessionStorage.setItem('fitsearch_sesion', JSON.stringify({
    ...SESION, usuario: { ...SESION.usuario, rol: 'administrador', rolConfirmado: true },
  }));
  simularApi({
    '/api/auth/logout': () => [204, null], '/api/administrador/alertas': { verificacionesPendientes: 0 },
    '/api/administrador/dashboard': {
      hoy: '2026-11-11', cola: { total: 0, masAntiguaDias: null, primeras: [] }, actividad: [], ultimasCuentas: [],
      cifras: { cuentas: { actual: 0, anterior: 0 }, reservas: { actual: 0, anterior: 0 }, resenas: { actual: 0, anterior: 0 }, preguntas: { actual: 0, anterior: 0 } },
      plataforma: { usuariosActivos: 0, usuariosInactivos: 0, profesionalesActivos: 0, establecimientos: {}, profesionales: 0, verificados: 0 },
    },
  });
  renderizarApp(ruta);
  // El administrador llega a su dashboard; Cerrar sesión está en el menú de la cuenta, como en los otros espacios.
  expect(await screen.findByRole('heading', { level: 1, name: /^Hola, / })).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: /menú de tu cuenta/ }));
  await userEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }));
  expect(await screen.findByText('Cerraste sesión correctamente.')).toBeInTheDocument();
  expect(sessionStorage.getItem('fitsearch_sesion')).toBeNull();
});

test.each([
  ['usuario', /¿Cómo quieres cuidarte hoy\?/],
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

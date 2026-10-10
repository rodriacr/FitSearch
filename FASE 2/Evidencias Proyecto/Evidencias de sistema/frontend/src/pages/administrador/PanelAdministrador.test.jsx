import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, test } from 'vitest';
import { renderizarApp, SESION, simularApi } from '../../tests/utilidades.jsx';

const ficha = { id: 2, revision: 1, activo: true, documentos: [], historial: [], nombre: 'Ana Demo', correo: 'ana@example.test', especialidad: 'Nutrición', descripcion: 'Atención nutricional', comuna: 'Ñuñoa', modalidad: 'online', verificado: false };
beforeEach(() => sessionStorage.setItem('fitsearch_sesion', JSON.stringify({ ...SESION, usuario: { ...SESION.usuario, rol: 'administrador' } })));

test('muestra pendientes y abre la revisión de una ficha real', async () => {
  simularApi({ '/api/administrador/profesionales/2': { profesional: ficha }, '/api/administrador/profesionales': { resultados: [ficha], total: 1, pagina: 1, totalPaginas: 1 } });
  renderizarApp('/admin/verificaciones');
  expect(await screen.findByText('Ana Demo')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Pendientes' })).toHaveAttribute('aria-pressed', 'true');
  await userEvent.click(screen.getByRole('link', { name: 'Revisar a Ana Demo' }));
  expect(await screen.findByRole('heading', { name: 'Detalle de verificación' })).toBeInTheDocument();
  expect(await screen.findByText('ana@example.test')).toBeInTheDocument();
});
test('solicita confirmación antes de verificar y refleja la respuesta persistida', async () => {
  let verificado = false;
  const fetch = simularApi({
    '/api/administrador/profesionales/2': () => [200, { profesional: { ...ficha, verificado } }],
    '/api/administrador/profesionales/2/decision': () => { verificado = true; return [200, { id: 2, verificado: true }]; },
  });
  renderizarApp('/admin/verificaciones/2');
  await userEvent.click(await screen.findByRole('button', { name: 'Aprobar verificación' }));
  expect(fetch.mock.calls.some(([, opciones]) => opciones.method === 'POST')).toBe(false);
  await userEvent.click(screen.getByRole('button', { name: 'Confirmar verificación' }));
  expect(await screen.findByText('El perfil fue verificado correctamente.')).toBeInTheDocument();
  expect(await screen.findByText('Verificado')).toBeInTheDocument();
  expect(fetch.mock.calls.find(([, opciones]) => opciones.method === 'POST')[0]).toBe('/api/administrador/profesionales/2/decision');
});
test('conserva la posibilidad de revisar cuando la aprobación falla', async () => {
  simularApi({ '/api/administrador/profesionales/2': { profesional: ficha }, '/api/administrador/profesionales/2/decision': () => [500, { error: 'No fue posible verificar' }] });
  renderizarApp('/admin/verificaciones/2');
  await userEvent.click(await screen.findByRole('button', { name: 'Aprobar verificación' }));
  await userEvent.click(screen.getByRole('button', { name: 'Confirmar verificación' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('No fue posible verificar');
  expect(screen.getByRole('button', { name: 'Confirmar verificación' })).toBeEnabled();
});
test('los filtros de usuarios se envían al servidor y reinician la página', async () => {
  const fetch = simularApi({ '/api/administrador/usuarios': { resultados: [], total: 0, pagina: 1, totalPaginas: 0 } });
  renderizarApp('/admin/usuarios');
  await screen.findByText('No hay resultados para estos filtros.');
  await userEvent.click(screen.getByRole('button', { name: 'Profesionales' }));
  await userEvent.type(screen.getByLabelText('Buscar por nombre o correo'), 'Ana');
  await userEvent.click(screen.getByRole('button', { name: 'Buscar' }));
  expect(fetch.mock.calls.some(([url]) => url.includes('q=Ana') && url.includes('rol=profesional') && url.includes('pagina=1'))).toBe(true);
});
test('los reportes muestran datos del servidor y cambian el período', async () => {
  const fetch = simularApi({ '/api/administrador/resumen': { usuarios: 8, profesionales: 3, pendientes: 2, verificados: 1, nuevosUsuarios: 4, nuevosProfesionales: 2, desde: '2026-10-01', hasta: '2026-10-10', registros: [{ fecha: '2026-10-10', rol: 'usuario', cantidad: 4 }] } });
  renderizarApp('/admin/reportes');
  expect(await screen.findByRole('table')).toBeInTheDocument();
  await userEvent.selectOptions(screen.getByLabelText('Período'), '7');
  expect(fetch.mock.calls.some(([url]) => url.endsWith('dias=7'))).toBe(true);
});

test('el rechazo exige motivo y envía la revisión de la ficha abierta', async () => {
  const fetch = simularApi({ '/api/administrador/profesionales/2': { profesional: ficha }, '/api/administrador/profesionales/2/decision': [200, { id: 2, verificado: false }] });
  renderizarApp('/admin/verificaciones/2');
  await userEvent.click(await screen.findByRole('button', { name: 'Rechazar solicitud' }));
  expect(screen.getByRole('button', { name: 'Confirmar decisión' })).toBeDisabled();
  await userEvent.type(screen.getByLabelText('Motivo obligatorio'), 'El título no es legible');
  await userEvent.click(screen.getByRole('button', { name: 'Confirmar decisión' }));
  const [, opciones] = fetch.mock.calls.find(([, o]) => o.method === 'POST');
  expect(JSON.parse(opciones.body)).toEqual({ accion: 'rechazar', motivo: 'El título no es legible', revision: 1 });
});
test('desactiva una cuenta solo después de confirmar y protege a los administradores', async () => {
  const fetch = simularApi({ '/api/administrador/usuarios': { resultados: [{ id: 7, nombre: 'Profesional Demo', correo: 'demo@example.test', rol: 'profesional', activo: true }, { id: 1, nombre: 'Administrador Demo', correo: 'admin@example.test', rol: 'administrador', activo: true }], total: 2, pagina: 1, totalPaginas: 1 }, '/api/administrador/usuarios/7/estado': [200, { id: 7, activo: false }] });
  renderizarApp('/admin/usuarios');
  await userEvent.click(await screen.findByRole('button', { name: 'Desactivar' }));
  expect(fetch.mock.calls.some(([, o]) => o.method === 'PATCH')).toBe(false);
  await userEvent.click(screen.getByRole('button', { name: 'Confirmar cambio' }));
  const [url, opciones] = fetch.mock.calls.find(([, o]) => o.method === 'PATCH');
  expect(url).toBe('/api/administrador/usuarios/7/estado');
  expect(JSON.parse(opciones.body)).toEqual({ activo: false });
});

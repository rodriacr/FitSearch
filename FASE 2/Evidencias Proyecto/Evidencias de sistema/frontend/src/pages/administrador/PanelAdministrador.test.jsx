import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, test, vi } from 'vitest';
import { llamadasA, renderizarApp, SESION, simularApi } from '../../tests/utilidades.jsx';

const ficha = { id: 2, revision: 1, estado: 'pendiente', activo: true, documentos: [], historial: [], nombre: 'Ana Demo', correo: 'ana@example.test', especialidad: 'Nutrición', descripcion: 'Atención nutricional', comuna: 'Ñuñoa', modalidad: 'online', verificado: false };
beforeEach(() => sessionStorage.setItem('fitsearch_sesion', JSON.stringify({ ...SESION, usuario: { ...SESION.usuario, rol: 'administrador' } })));

test('el listado Todos identifica fichas sin solicitud sin llamarlas pendientes', async () => {
  simularApi({ '/api/administrador/profesionales': { resultados: [{ ...ficha, estado: 'sin_solicitud' }], total: 1, pagina: 1, totalPaginas: 1 } });
  renderizarApp('/admin/profesionales');
  expect(await screen.findByText('Sin solicitud')).toBeInTheDocument();
  expect(screen.queryByText('Pendiente')).not.toBeInTheDocument();
});

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


test.each(['rechazar', 'revocar'])('oculta decisiones después de %s y al recargar hasta recibir otra solicitud', async (accion) => {
  let actual = { ...ficha, verificado: accion === 'revocar', estado: accion === 'revocar' ? 'verificado' : 'pendiente' };
  simularApi({
    '/api/administrador/profesionales/2': () => [200, { profesional: actual }],
    '/api/administrador/profesionales/2/decision': () => { actual = { ...actual, verificado: false, estado: 'rechazado', revision: 2 }; return [200, { id: 2, verificado: false }]; },
  });
  const vista = renderizarApp('/admin/verificaciones/2');
  await userEvent.click(await screen.findByRole('button', { name: accion === 'revocar' ? 'Revocar verificación' : 'Rechazar solicitud' }));
  await userEvent.type(screen.getByLabelText('Motivo obligatorio'), 'Documentos por corregir');
  await userEvent.click(screen.getByRole('button', { name: 'Confirmar decisión' }));
  expect(await screen.findByText(/La solicitud está cerrada/)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Aprobar verificación' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Rechazar solicitud' })).not.toBeInTheDocument();
  vista.unmount();
  const recarga = renderizarApp('/admin/verificaciones/2');
  expect(await screen.findByText(/La solicitud está cerrada/)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Aprobar verificación' })).not.toBeInTheDocument();
  recarga.unmount();
  actual = { ...actual, estado: 'pendiente', revision: 3 };
  renderizarApp('/admin/verificaciones/2');
  expect(await screen.findByRole('button', { name: 'Aprobar verificación' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Rechazar solicitud' })).toBeInTheDocument();
});


test('una ficha sin solicitud enviada no ofrece decisiones administrativas', async () => {
  simularApi({ '/api/administrador/profesionales/2': { profesional: { ...ficha, estado: 'sin_solicitud' } } });
  renderizarApp('/admin/verificaciones/2');
  expect(await screen.findByText('Sin solicitud enviada')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Aprobar verificación' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Rechazar solicitud' })).not.toBeInTheDocument();
});

// Diseño común, dashboard y reportes (11-11-2026).
const DASHBOARD = {
  hoy: '2026-11-11',
  cola: {
    total: 2, masAntiguaDias: 10,
    primeras: [
      { id: 2, nombre: 'Ana Demo', especialidad: 'Nutrición', comuna: 'San Antonio', documentos: 2, solicitadoEl: '2026-11-01T12:00:00Z', diasEsperando: 10 },
      { id: 3, nombre: 'Luis Demo', especialidad: 'Kinesiología', comuna: 'Cartagena', documentos: 1, solicitadoEl: '2026-11-11T12:00:00Z', diasEsperando: 0 },
    ],
  },
  cifras: { cuentas: { actual: 7, anterior: 4 }, reservas: { actual: 3, anterior: 3 }, resenas: { actual: 1, anterior: 2 }, preguntas: { actual: 12, anterior: 5 } },
  actividad: Array.from({ length: 14 }, (_, i) => ({ fecha: `2026-${i < 3 ? '10' : '11'}-${String(i < 3 ? 29 + i : i - 2).padStart(2, '0')}`, cuentas: i % 2, reservas: i % 3 ? 1 : 0, resenas: 0 })),
  ultimasCuentas: [{ id: 9, nombre: 'Camila Rojas', rol: 'profesional', activo: true, fechaRegistro: '2026-11-11T13:00:00Z' }],
  plataforma: { usuariosActivos: 40, usuariosInactivos: 2, profesionalesActivos: 6, establecimientos: { gimnasio: 12, centro_salud: 4 }, profesionales: 8, verificados: 6 },
};
const sesionAdmin = () => sessionStorage.setItem('fitsearch_sesion', JSON.stringify({ ...SESION, usuario: { ...SESION.usuario, nombre: 'Rodrigo Cárcamo', rol: 'administrador' } }));

test('el dashboard muestra la cola por antigüedad, las cifras de 7 días, la actividad y las últimas cuentas', async () => {
  sesionAdmin();
  simularApi({ '/api/administrador/dashboard': DASHBOARD, '/api/administrador/alertas': { verificacionesPendientes: 2 } });
  renderizarApp('/admin/dashboard');
  expect(await screen.findByRole('heading', { level: 1, name: 'Hola, Rodrigo' })).toBeInTheDocument();
  expect(screen.getByText(/Miércoles, 11 de noviembre\. Esto es lo que necesita tu atención\./)).toBeInTheDocument();
  const cola = screen.getByRole('heading', { name: 'Verificaciones por revisar' }).closest('section');
  expect(cola).toHaveTextContent('2 solicitudes pendientes · la más antigua espera hace 10 días');
  expect(within(cola).getByRole('link', { name: 'Revisar a Ana Demo' })).toHaveAttribute('href', '/admin/verificaciones/2');
  expect(within(cola).getByText('Espera hace 10 días')).toHaveClass('admin-espera--atrasada');
  expect(within(cola).getByText('Llegó hoy')).not.toHaveClass('admin-espera--atrasada');
  const cifras = within(document.querySelector('.admin-dashboard__cifras')).getByText('Cuentas nuevas').closest('div');
  expect(cifras).toHaveTextContent('7+3 vs. los 7 días anteriores');
  expect(within(document.querySelector('.admin-dashboard__cifras')).getByText('Reservas').closest('div')).toHaveTextContent('Igual que los 7 días anteriores');
  expect(screen.getByRole('table', { name: 'Cuentas nuevas, reservas y reseñas por día' })).toBeInTheDocument();
  const cuentas = screen.getByRole('heading', { name: 'Últimas cuentas' }).closest('section');
  expect(cuentas).toHaveTextContent('Camila RojasProfesional');
  const plataforma = screen.getByRole('heading', { name: 'Estado de la plataforma' }).closest('section');
  expect(plataforma).toHaveTextContent('Profesionales verificados6 de 8');
  expect(plataforma).toHaveTextContent('Gimnasios12');
  expect(within(plataforma).getByRole('img', { name: '75 % de los profesionales está verificado' })).toBeInTheDocument();
});

test('el administrador tiene el mismo encabezado: su cuenta dice Administrador y la campana avisa las verificaciones', async () => {
  sesionAdmin();
  simularApi({ '/api/administrador/dashboard': DASHBOARD, '/api/administrador/alertas': { verificacionesPendientes: 2 } });
  renderizarApp('/admin/dashboard');
  await screen.findByRole('heading', { level: 1, name: 'Hola, Rodrigo' });
  expect(screen.getByRole('link', { name: 'FitSearch, ir al inicio' })).toHaveAttribute('href', '/admin/dashboard');
  const campana = await screen.findByRole('button', { name: 'Notificaciones: 2 verificaciones pendientes' });
  await userEvent.click(campana);
  expect(screen.getByRole('link', { name: /2 verificaciones pendientes/ })).toHaveAttribute('href', '/admin/verificaciones');
  await userEvent.click(screen.getByRole('button', { name: 'Hola, Rodrigo (administrador): menú de tu cuenta' }));
  const cuenta = document.getElementById('menu-cuenta');
  expect(cuenta).toHaveTextContent(/Rodrigo Cárcamo\s*Administrador/);
  expect(within(cuenta).queryByRole('link', { name: /perfil/i })).not.toBeInTheDocument();
  expect(within(cuenta).getByRole('button', { name: 'Cerrar sesión' })).toBeInTheDocument();
  // El menú lateral es el de la app: sin datos de la cuenta ni otro botón de cerrar sesión.
  const menu = screen.getByRole('navigation', { name: 'Menú principal' });
  expect(within(menu).getAllByRole('link').map((enlace) => enlace.textContent)).toEqual(['Dashboard', 'Verificaciones', 'Profesionales', 'Usuarios', 'Reportes', 'Contenido']);
  expect(within(menu).queryByRole('button', { name: 'Cerrar sesión' })).not.toBeInTheDocument();
  await userEvent.click(within(menu).getByRole('button', { name: 'Contraer menú' }));
  expect(localStorage.getItem('fitsearch_menu_compacto')).toBe('1');
  expect(within(menu).getByRole('link', { name: 'Usuarios' })).toHaveAttribute('href', '/admin/usuarios');
});

test('los reportes muestran cada área una vez, cambian el período y se descargan en CSV', async () => {
  sesionAdmin();
  const grupo = (clave, desde, hasta, extra) => ({ clave, desde, hasta, actual: false, ...extra });
  const reporte = (dias) => ({
    periodo: { dias, desde: '2026-10-13', hasta: '2026-11-11', agrupacion: dias === 365 ? 'mes' : 'semana' },
    anterior: { desde: '2026-09-13', hasta: '2026-10-12' },
    crecimiento: { grupos: [grupo('2026-11-09', '2026-11-09', '2026-11-11', { usuario: 2, profesional: 1 })], nuevas: 3, nuevasAnterior: 1, profesionalesNuevos: 1, usuariosActivos: 40, inactivas: 2 },
    oferta: { embudo: { sinSolicitud: 1, pendiente: 2, verificado: 6, rechazado: 1 }, porEspecialidad: [{ etiqueta: 'Nutrición', valor: 4 }], porComuna: [{ etiqueta: 'San Antonio', valor: 3 }], verificacion: { aprobadas: 2, promedio: 1.8, mediana: 1.8 } },
    demanda: { grupos: [grupo('2026-11-09', '2026-11-09', '2026-11-11', { confirmada: 2, pendiente: 1, cancelada: 1 })], reservas: 4, reservasAnterior: 2, canceladas: 1, tasaCancelacion: 25, porEspecialidad: [{ etiqueta: 'Nutrición', valor: 3 }], profesionalesConReservas: 3, verificados: 6 },
    calidad: { resenas: 3, promedio: 4.3, distribucion: { 5: 2, 4: 0, 3: 1, 2: 0, 1: 0 }, conCita: 2 },
    uso: { asistente: 12, comidas: 8, agua: 5, reservas: 6, favoritos: 4, planes: 2, usuariosActivos: 40 },
  });
  const fetch = simularApi({ '/api/administrador/reportes': (url) => [200, reporte(Number(new URL(url, 'http://x').searchParams.get('dias')))] });
  renderizarApp('/admin/reportes');
  expect(await screen.findByRole('heading', { name: 'Crecimiento' })).toBeInTheDocument();
  expect(screen.getByText(/Del 13 de octubre de 2026 al 11 de noviembre de 2026, comparado con los 30 días anteriores\./)).toBeInTheDocument();
  for (const area of ['Demanda: reservas de horas', 'Oferta: profesionales', 'Calidad: reseñas', 'Uso de las funciones']) {
    expect(screen.getAllByRole('heading', { name: area })).toHaveLength(1);
  }
  expect(screen.getByText('Cancelación').closest('div')).toHaveTextContent('25 %1 de 4 reservas');
  expect(screen.getByText('Profesionales con reservas').closest('div')).toHaveTextContent('50 %3 de 6 verificados');
  expect(screen.getByText(/Verificar tomó 1,8 días en promedio/)).toBeInTheDocument();
  expect(screen.getByRole('list', { name: 'Personas que usaron cada función' })).toHaveTextContent('Asistente IA12 (30 %)');
  // No se repite el gráfico del dashboard.
  expect(screen.queryByRole('table', { name: 'Cuentas nuevas, reservas y reseñas por día' })).not.toBeInTheDocument();

  await userEvent.click(screen.getByRole('button', { name: '12 meses' }));
  expect(llamadasA(fetch, '/api/administrador/reportes').some(([url]) => url.endsWith('dias=365'))).toBe(true);
  expect(await screen.findByText(/comparado con los 12 meses anteriores/)).toBeInTheDocument();

  const crear = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:reporte');
  const revocar = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  const clic = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  await userEvent.click(screen.getByRole('button', { name: /Descargar CSV/ }));
  const csv = await crear.mock.calls[0][0].text();
  expect(csv).toContain('"Demanda";"Tasa de cancelación (%)";"25"');
  expect(clic).toHaveBeenCalled();
  crear.mockRestore(); revocar.mockRestore(); clic.mockRestore();
});

test('verificaciones es una cola de la solicitud más antigua a la más reciente, con días de espera y documentos', async () => {
  sesionAdmin();
  const fetch = simularApi({ '/api/administrador/profesionales': { resultados: [{ ...ficha, diasEsperando: 4, documentos: 2 }], total: 1, pagina: 1, totalPaginas: 1 } });
  renderizarApp('/admin/verificaciones');
  expect(await screen.findByText('Espera hace 4 días')).toHaveClass('admin-espera--atrasada');
  expect(screen.getByText('2 documentos')).toBeInTheDocument();
  expect(llamadasA(fetch, '/api/administrador/profesionales').at(-1)[0]).toContain('vista=cola');
  expect(screen.getAllByRole('button', { name: /Pendientes|Rechazadas|Aprobadas/ }).map((b) => b.textContent)).toEqual(['Pendientes', 'Rechazadas', 'Aprobadas']);
});

test('profesionales es un directorio con calificación y reservas', async () => {
  sesionAdmin();
  const fetch = simularApi({
    '/api/administrador/profesionales': { resultados: [{ ...ficha, estado: 'verificado', verificado: true, calificacion: { promedio: 4.7, total: 3 }, reservas: 5 }], total: 1, pagina: 1, totalPaginas: 1 },
  });
  renderizarApp('/admin/profesionales');
  expect(await screen.findByText(/★ 4,7 · 3 reseñas · 5 reservas/)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Revisar a Ana Demo' })).toHaveTextContent('Ver ficha');
  expect(llamadasA(fetch, '/api/administrador/profesionales').at(-1)[0]).toContain('vista=directorio');
});

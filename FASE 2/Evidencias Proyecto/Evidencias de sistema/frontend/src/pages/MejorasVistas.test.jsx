import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom';
import { beforeEach, expect, test } from 'vitest';
import { SesionProvider } from '../context/SesionContext.jsx';
import { useSesion } from '../context/SesionContext.jsx';
import AvisosMensajesProvider from '../context/AvisosMensajesProvider.jsx';
import useAvisosMensajes from '../services/useAvisosMensajes.js';
import InicioProfesional from './profesional/InicioProfesional.jsx';
import Comidas from './Comidas.jsx';
import reglas from '@shared/reglas.json';
import { MI_FICHA, PERFIL_COMPLETO, renderizarApp, respuestaJson, respuestaPerfil, SESION, SESION_PROFESIONAL, simularApi } from '../tests/utilidades.jsx';

const resumen = { inicio: '2026-11-23', fin: '2026-11-29', totalClientes: 2, citasRealizadas: 1, citasPendientes: 0, clientesNuevos: 0 };
const cuenta = { nombre: 'Matías Rojas', biografia: 'Mi presentación' };
const base = {
  '/api/profesionales/mi-ficha': { ficha: MI_FICHA }, '/api/profesional/reportes': { resumenSemanal: resumen },
  '/api/perfil/cuenta': { cuenta }, '/api/disponibilidades': { horarios: [{ id: 1 }] }, '/api/reservas': { reservas: [] },
};
const envolver = (contenido) => <MemoryRouter><SesionProvider>{contenido}</SesionProvider></MemoryRouter>;
beforeEach(() => sessionStorage.setItem('fitsearch_sesion', JSON.stringify(SESION_PROFESIONAL)));

test('no anuncia que está al día antes de terminar la comprobación de horarios', async () => {
  let terminar;
  const fetch = simularApi(base);
  const anterior = fetch.getMockImplementation();
  fetch.mockImplementation((url, o) => url === '/api/disponibilidades' ? new Promise((resolve) => { terminar = resolve; }) : anterior(url, o));
  render(envolver(<InicioProfesional />));
  expect(screen.getByText('Cargando tus tareas…')).toBeInTheDocument();
  expect(screen.queryByText('Estás al día: no tienes tareas pendientes.')).not.toBeInTheDocument();
  await act(async () => terminar(await respuestaJson(200, { horarios: [{ id: 1 }] })));
  expect(await screen.findByText('Estás al día: no tienes tareas pendientes.')).toBeInTheDocument();
});

test('si falla una fuente de tareas avisa, y reintentar recupera el estado comprobado', async () => {
  let fallar = true;
  simularApi({ ...base, '/api/disponibilidades': () => fallar ? [503, { error: 'Sin conexión' }] : [200, { horarios: [{ id: 1 }] }] });
  render(envolver(<InicioProfesional />));
  expect(await screen.findByRole('alert')).toHaveTextContent('Las tareas pueden estar incompletas');
  expect(screen.queryByText('Estás al día: no tienes tareas pendientes.')).not.toBeInTheDocument();
  fallar = false;
  await userEvent.click(screen.getByRole('button', { name: 'Reintentar tareas' }));
  expect(await screen.findByText('Estás al día: no tienes tareas pendientes.')).toBeInTheDocument();
});

test('agenda: una consulta fallida no se presenta como ausencia de solicitudes', async () => {
  const hoy = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Santiago' }).format(new Date());
  simularApi({ '/api/agenda/semana': (url) => {
    const desde = new URL(url, 'http://localhost').searchParams.get('desde');
    return [200, { desde, hasta: desde, hoy, ahora: '10:00', horarios: [], bloqueos: [], listaEspera: 0 }];
  }, '/api/reservas': () => [503, { error: 'No hay conexión' }] });
  renderizarApp('/profesional/agenda');
  expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos comprobar las solicitudes pendientes');
  expect(screen.queryByText('No tienes solicitudes pendientes.')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Reintentar solicitudes' })).toBeInTheDocument();
});

test.each([
  ['usuario', '/perfil', 'Datos físicos'], ['profesional', '/profesional/perfil', 'Lugar de atención'],
])('el perfil %s conserva lo escrito al cambiar de sección y volver', async (rol, ruta, seccion) => {
  sessionStorage.setItem('fitsearch_sesion', JSON.stringify(rol === 'usuario' ? SESION : SESION_PROFESIONAL));
  const fetch = simularApi({ ...base, '/api/perfil': respuestaPerfil(PERFIL_COMPLETO), '/api/profesionales/3': { profesional: { id: 3, nombre: 'Matías', especialidad: 'Nutrición', calificacion: { total: 0 } } } });
  renderizarApp(ruta);
  const nombre = await screen.findByLabelText('Nombre completo');
  await userEvent.clear(nombre); await userEvent.type(nombre, 'Mi borrador sin guardar');
  const nav = screen.getByRole('navigation', { name: 'Secciones del perfil' });
  await userEvent.click(within(nav).getByRole('button', { name: seccion }));
  expect(nombre).not.toBeVisible();
  await userEvent.click(within(nav).getByRole('button', { name: 'Información personal' }));
  expect(screen.getByLabelText('Nombre completo')).toHaveValue('Mi borrador sin guardar');
  expect(fetch.mock.calls.some(([, opciones]) => opciones.method === 'PUT')).toBe(false);
});

function Indicador({ nombre }) { const { total } = useAvisosMensajes(); return <output aria-label={nombre}>{total}</output>; }
test('campana y mensajería comparten una única petición de mensajes sin leer', async () => {
  const fetch = simularApi({ '/api/chats/no-leidos': { total: 3 } });
  const ui = render(envolver(<AvisosMensajesProvider><Indicador nombre="Campana" /><Indicador nombre="Chat" /></AvisosMensajesProvider>));
  await waitFor(() => expect(screen.getByLabelText('Campana')).toHaveTextContent('3'));
  expect(screen.getByLabelText('Chat')).toHaveTextContent('3');
  expect(fetch.mock.calls.filter(([url]) => url === '/api/chats/no-leidos')).toHaveLength(1);
  ui.unmount();
});

test('los dos indicadores se actualizan juntos al leer un chat', async () => {
  let total = 3;
  simularApi({ '/api/chats/no-leidos': () => [200, { total }] });
  render(envolver(<AvisosMensajesProvider><Indicador nombre="Campana" /><Indicador nombre="Chat" /></AvisosMensajesProvider>));
  await waitFor(() => expect(screen.getByLabelText('Chat')).toHaveTextContent('3'));
  total = 0;
  act(() => window.dispatchEvent(new Event('fitsearch:mensajes-actualizados')));
  await waitFor(() => expect(screen.getByLabelText('Campana')).toHaveTextContent('0'));
  expect(screen.getByLabelText('Chat')).toHaveTextContent('0');
});

test('si se lee un mensaje durante la consulta, actualiza de nuevo al terminar y no deja el contador antiguo', async () => {
  let terminar;
  let numero = 0;
  const fetch = simularApi({});
  fetch.mockImplementation(() => ++numero === 1 ? new Promise((resolve) => { terminar = resolve; }) : respuestaJson(200, { total: 0 }));
  render(envolver(<AvisosMensajesProvider><Indicador nombre="Campana" /></AvisosMensajesProvider>));
  act(() => window.dispatchEvent(new Event('fitsearch:mensajes-actualizados')));
  await act(async () => terminar(await respuestaJson(200, { total: 3 })));
  await waitFor(() => expect(screen.getByLabelText('Campana')).toHaveTextContent('0'));
  expect(fetch).toHaveBeenCalledTimes(2);
});

function CambiarCuenta() { const { actualizarSesion } = useSesion(); return <button onClick={() => actualizarSesion({ ...SESION, token: 'otra-sesion' })}>Cambiar cuenta de prueba</button>; }
test('otra sesión empieza sin el contador de la cuenta anterior', async () => {
  let numero = 0;
  let terminar;
  const fetch = simularApi({});
  fetch.mockImplementation(() => ++numero === 1 ? respuestaJson(200, { total: 8 }) : new Promise((resolve) => { terminar = resolve; }));
  render(envolver(<AvisosMensajesProvider><CambiarCuenta /><Indicador nombre="Campana" /></AvisosMensajesProvider>));
  await waitFor(() => expect(screen.getByLabelText('Campana')).toHaveTextContent('8'));
  await userEvent.click(screen.getByRole('button', { name: 'Cambiar cuenta de prueba' }));
  expect(screen.getByLabelText('Campana')).toHaveTextContent('0');
  await act(async () => terminar(await respuestaJson(200, { total: 1 })));
  expect(screen.getByLabelText('Campana')).toHaveTextContent('1');
});

function Direccion() {
  const lugar = useLocation(); const ir = useNavigate();
  return <><output aria-label="Dirección">{lugar.search}</output><button onClick={() => ir(-1)}>Atrás de prueba</button></>;
}
test('Comidas sincroniza la URL y respeta Atrás sin perder parámetros ajenos', async () => {
  const objetivo = { calorias: 2100, proteinasG: 100, carbohidratosG: 220, grasasG: 65, perfil: { objetivoPrincipal: 'Mantener peso', pesoKg: 70, alturaCm: 170, actividadFisica: 'Moderada' } };
  simularApi({ '/api/comidas/semana': { objetivoCalorias: 2100, dias: [] }, '/api/comidas': { fecha: '2026-11-25', hoy: '2026-11-25', objetivo, consumo: { calorias: 0, proteinasG: 0, carbohidratosG: 0, grasasG: 0 }, momentos: reglas.comidas.momentos.map(({ valor, etiqueta }) => ({ momento: valor, etiqueta, registros: [], totales: { calorias: 0 } })) } });
  render(<MemoryRouter initialEntries={['/comidas?origen=prueba']}><SesionProvider><Direccion /><Comidas /></SesionProvider></MemoryRouter>);
  await userEvent.click(screen.getByRole('button', { name: 'Comidas', exact: true }));
  expect(screen.getByLabelText('Dirección')).toHaveTextContent('?origen=prueba&seccion=comidas');
  expect(screen.getByRole('button', { name: 'Comidas', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await userEvent.click(screen.getByRole('button', { name: 'Atrás de prueba' }));
  expect(screen.getByRole('button', { name: 'Resumen', exact: true })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByLabelText('Dirección')).toHaveTextContent('?origen=prueba');
});

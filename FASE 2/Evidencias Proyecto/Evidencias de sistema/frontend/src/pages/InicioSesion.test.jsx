import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import {
  listado, llamadasA, parametrosDe, PERFIL_COMPLETO, renderizarApp, respuestaJson, respuestaPerfil, SESION, simularApi,
} from '../tests/utilidades.jsx';

const API_CON_SESION = {
  '/api/auth/login': SESION,
  '/api/perfil': respuestaPerfil(PERFIL_COMPLETO),
  '/api/profesionales/filtros': { especialidades: [], comunas: [] },
  '/api/profesionales': listado([]),
};
const TITULO_INICIO = { level: 1, name: 'Tu salud y bienestar, en un solo lugar' };

async function ingresar({ recordar = false } = {}) {
  await userEvent.type(screen.getByLabelText('Correo electrónico'), 'ana@correo.cl');
  await userEvent.type(screen.getByLabelText('Contraseña'), 'ClaveSegura123');
  if (recordar) await userEvent.click(screen.getByLabelText('Recordarme'));
  await userEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }));
}

describe('Inicio de sesión (FS-HU-01)', () => {
  test('escenario 2: con credenciales incorrectas muestra un mensaje sin indicar cuál dato falló', async () => {
    vi.spyOn(globalThis, 'fetch').mockReturnValue(respuestaJson(401, { error: 'Correo o contraseña incorrectos' }));
    renderizarApp('/iniciar-sesion');

    await userEvent.type(screen.getByLabelText('Correo electrónico'), 'ana@correo.cl');
    await userEvent.type(screen.getByLabelText('Contraseña'), 'incorrecta1');
    await userEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }));

    expect(await screen.findByText('Correo o contraseña incorrectos')).toBeInTheDocument();
    expect(localStorage.getItem('fitsearch_sesion')).toBeNull();
  });

  test('FS-HU-17 escenario 3: con "Recordarme" guarda la sesión en localStorage y llega al Inicio (FS-HU-21)', async () => {
    const fetch = simularApi(API_CON_SESION);
    renderizarApp('/iniciar-sesion');

    await ingresar({ recordar: true });

    expect(await screen.findByRole('heading', TITULO_INICIO)).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Menú principal' })).toBeInTheDocument();
    expect(await screen.findByText('Sesión iniciada como Ana Pérez.')).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem('fitsearch_sesion')).token).toBe('token-de-prueba');
    expect(sessionStorage.getItem('fitsearch_sesion')).toBeNull();
    expect(JSON.parse(fetch.mock.calls[0][1].body).recordar).toBe(true);
  });

  test('sin "Recordarme" la sesión se guarda solo mientras el navegador esté abierto', async () => {
    simularApi(API_CON_SESION);
    renderizarApp('/iniciar-sesion');

    await ingresar();

    expect(await screen.findByRole('heading', TITULO_INICIO)).toBeInTheDocument();
    expect(JSON.parse(sessionStorage.getItem('fitsearch_sesion')).token).toBe('token-de-prueba');
    expect(localStorage.getItem('fitsearch_sesion')).toBeNull();
  });

  test('el botón del ojo muestra y oculta la contraseña', async () => {
    renderizarApp('/iniciar-sesion');
    const campo = screen.getByLabelText('Contraseña');

    expect(campo).toHaveAttribute('type', 'password');
    await userEvent.click(screen.getByRole('button', { name: 'Mostrar contraseña' }));
    expect(campo).toHaveAttribute('type', 'text');
    await userEvent.click(screen.getByRole('button', { name: 'Ocultar contraseña' }));
    expect(campo).toHaveAttribute('type', 'password');
  });

  test('no envía la petición si faltan datos', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch');
    renderizarApp('/iniciar-sesion');

    await userEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }));

    expect(screen.getByText('El correo es obligatorio')).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  test('sin sesión, la ruta de perfil redirige al inicio de sesión', () => {
    renderizarApp('/perfil');
    expect(screen.getByRole('heading', { name: '¡Bienvenido!' })).toBeInTheDocument();
  });

  test('sin sesión, el Inicio también pide iniciar sesión y luego vuelve a él', async () => {
    simularApi(API_CON_SESION);
    renderizarApp('/inicio');
    expect(screen.getByRole('heading', { name: '¡Bienvenido!' })).toBeInTheDocument();

    await ingresar();
    expect(await screen.findByRole('heading', TITULO_INICIO)).toBeInTheDocument();
  });

  test('una búsqueda compartida se recupera con sus filtros después de iniciar sesión', async () => {
    const fetch = simularApi(API_CON_SESION);
    renderizarApp('/profesionales?q=nutri&modalidad=online');

    await ingresar();

    expect(await screen.findByRole('heading', { level: 1, name: 'Profesionales' })).toBeInTheDocument();
    expect(screen.getByRole('searchbox', { name: 'Buscar profesionales' })).toHaveValue('nutri');
    await vi.waitFor(() => expect(llamadasA(fetch, '/api/profesionales?').length).toBeGreaterThan(0));
    expect(parametrosDe(llamadasA(fetch, '/api/profesionales?').at(-1)[0])).toMatchObject({ q: 'nutri', modalidad: 'online' });
  });

  test('si aún no elige su tipo de cuenta, el Inicio lo lleva al asistente sin perder el aviso de sesión', async () => {
    simularApi({ ...API_CON_SESION, '/api/perfil': respuestaPerfil({ tipoCuenta: false }) });
    renderizarApp('/iniciar-sesion');

    await ingresar();

    expect(await screen.findByRole('heading', { name: 'Tipo de cuenta' })).toBeInTheDocument();
    expect(screen.getByText('Sesión iniciada como Ana Pérez.')).toBeInTheDocument();
  });
});

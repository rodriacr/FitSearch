import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import { renderizarApp, respuestaJson, respuestaPerfil, SESION } from '../tests/utilidades.jsx';

const respuestaSesion = (url) => (url === '/api/auth/login'
  ? respuestaJson(200, SESION)
  : respuestaJson(200, respuestaPerfil()));

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

  test('FS-HU-17 escenario 3: con "Recordarme" guarda la sesión en localStorage y abre el perfil', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch').mockImplementation(respuestaSesion);
    renderizarApp('/iniciar-sesion');

    await userEvent.type(screen.getByLabelText('Correo electrónico'), 'ana@correo.cl');
    await userEvent.type(screen.getByLabelText('Contraseña'), 'ClaveSegura123');
    await userEvent.click(screen.getByLabelText('Recordarme'));
    await userEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }));

    expect(await screen.findByRole('heading', { name: 'Datos personales' })).toBeInTheDocument();
    expect(await screen.findByText('Sesión iniciada como Ana Pérez.')).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem('fitsearch_sesion')).token).toBe('token-de-prueba');
    expect(sessionStorage.getItem('fitsearch_sesion')).toBeNull();
    expect(JSON.parse(fetch.mock.calls[0][1].body).recordar).toBe(true);
  });

  test('sin "Recordarme" la sesión se guarda solo mientras el navegador esté abierto', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(respuestaSesion);
    renderizarApp('/iniciar-sesion');

    await userEvent.type(screen.getByLabelText('Correo electrónico'), 'ana@correo.cl');
    await userEvent.type(screen.getByLabelText('Contraseña'), 'ClaveSegura123');
    await userEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }));

    expect(await screen.findByRole('heading', { name: 'Datos personales' })).toBeInTheDocument();
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
});

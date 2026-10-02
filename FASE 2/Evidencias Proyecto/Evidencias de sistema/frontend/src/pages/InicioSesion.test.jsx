import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import { renderizarApp, respuestaJson, SESION } from '../tests/utilidades.jsx';

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

  test('con credenciales correctas guarda la sesión y abre el perfil', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation((url) => (url === '/api/auth/login'
      ? respuestaJson(200, SESION)
      : respuestaJson(200, { usuario: SESION.usuario, perfil: { pesoKg: null, alturaCm: null, edad: null, sexo: null, actividadFisica: null }, completo: false, requerimientoCaloricoKcal: null })));
    renderizarApp('/iniciar-sesion');

    await userEvent.type(screen.getByLabelText('Correo electrónico'), 'ana@correo.cl');
    await userEvent.type(screen.getByLabelText('Contraseña'), 'ClaveSegura123');
    await userEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }));

    expect(await screen.findByRole('heading', { name: 'Hola, Ana Pérez' })).toBeInTheDocument();
    expect(await screen.findByText('Sesión iniciada como Ana Pérez.')).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem('fitsearch_sesion')).token).toBe('token-de-prueba');
  });

  test('no envía la petición si faltan datos', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch');
    renderizarApp('/iniciar-sesion');

    await userEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }));

    expect(screen.getByText('El correo es obligatorio')).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  test('cerrar sesión descarta el token y vuelve al inicio de sesión', async () => {
    localStorage.setItem('fitsearch_sesion', JSON.stringify(SESION));
    vi.spyOn(globalThis, 'fetch').mockImplementation((url) => (url === '/api/auth/logout'
      ? Promise.resolve(new Response(null, { status: 204 }))
      : respuestaJson(200, { usuario: SESION.usuario, perfil: { pesoKg: 70, alturaCm: 175, edad: 30, sexo: 'femenino', actividadFisica: 'ligera' }, completo: true, requerimientoCaloricoKcal: 2050 })));
    renderizarApp('/perfil');

    await userEvent.click(await screen.findByRole('button', { name: 'Cerrar sesión' }));

    expect(await screen.findByRole('heading', { name: 'Inicia sesión' })).toBeInTheDocument();
    expect(screen.getByText('Cerraste sesión correctamente.')).toBeInTheDocument();
    expect(localStorage.getItem('fitsearch_sesion')).toBeNull();
  });

  test('sin sesión, la ruta de perfil redirige al inicio de sesión', () => {
    renderizarApp('/perfil');
    expect(screen.getByRole('heading', { name: 'Inicia sesión' })).toBeInTheDocument();
  });
});

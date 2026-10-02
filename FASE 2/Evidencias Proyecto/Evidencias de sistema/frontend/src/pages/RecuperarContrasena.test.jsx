import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import { renderizarApp, respuestaJson } from '../tests/utilidades.jsx';

const MENSAJE = 'Si el correo está registrado, te enviamos un enlace para restablecer tu contraseña. Revisa tu bandeja de entrada.';
const ENLACE_INVALIDO = 'El enlace no es válido o ya venció. Solicita uno nuevo.';
const TOKEN = 'a'.repeat(64);

async function escribirNuevaContrasena() {
  await userEvent.type(screen.getByLabelText('Nueva contraseña'), 'NuevaClave456');
  await userEvent.type(screen.getByLabelText('Confirmar nueva contraseña'), 'NuevaClave456');
  await userEvent.click(screen.getByRole('button', { name: 'Guardar contraseña' }));
}

describe('Recuperar contraseña (FS-HU-15)', () => {
  test('se llega desde el inicio de sesión con "¿Olvidaste tu contraseña?"', async () => {
    renderizarApp('/iniciar-sesion');
    await userEvent.click(screen.getByRole('link', { name: '¿Olvidaste tu contraseña?' }));
    expect(screen.getByRole('heading', { name: '¿Olvidaste tu contraseña?' })).toBeInTheDocument();
  });

  test('escenario 1: solicita el enlace y muestra el mensaje de confirmación', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch').mockReturnValue(respuestaJson(200, { mensaje: MENSAJE }));
    renderizarApp('/recuperar-contrasena');

    await userEvent.type(screen.getByLabelText('Correo electrónico'), 'ana@correo.cl');
    await userEvent.click(screen.getByRole('button', { name: 'Enviar enlace' }));

    expect(await screen.findByText(MENSAJE)).toBeInTheDocument();
    expect(fetch.mock.calls[0][0]).toBe('/api/auth/recuperar');
  });

  test('no envía la solicitud con un correo inválido', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch');
    renderizarApp('/recuperar-contrasena');

    await userEvent.type(screen.getByLabelText('Correo electrónico'), 'ana@');
    await userEvent.click(screen.getByRole('button', { name: 'Enviar enlace' }));

    expect(screen.getByText('Ingresa un correo válido')).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  test('escenario 2: con el enlace del correo guarda la contraseña nueva', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch').mockReturnValue(
      respuestaJson(200, { mensaje: 'Tu contraseña fue actualizada. Ya puedes iniciar sesión.' }));
    renderizarApp(`/restablecer-contrasena?token=${TOKEN}`);

    await escribirNuevaContrasena();

    expect(await screen.findByText('Tu contraseña fue actualizada. Ya puedes iniciar sesión.')).toBeInTheDocument();
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({ token: TOKEN, password: 'NuevaClave456' });
    expect(screen.getByRole('link', { name: 'Iniciar sesión' })).toBeInTheDocument();
  });

  test('escenario 3: con un enlace vencido muestra el error del servidor', async () => {
    vi.spyOn(globalThis, 'fetch').mockReturnValue(respuestaJson(400, { error: ENLACE_INVALIDO }));
    renderizarApp(`/restablecer-contrasena?token=${TOKEN}`);

    await escribirNuevaContrasena();

    expect(await screen.findByText(ENLACE_INVALIDO)).toBeInTheDocument();
  });

  test('sin código en el enlace ofrece solicitar uno nuevo', () => {
    renderizarApp('/restablecer-contrasena');
    expect(screen.getByRole('link', { name: 'Solicitar un enlace nuevo' })).toBeInTheDocument();
  });
});

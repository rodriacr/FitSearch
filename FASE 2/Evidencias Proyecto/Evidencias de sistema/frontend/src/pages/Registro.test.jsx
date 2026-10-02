import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import { renderizarApp, respuestaJson, respuestaPerfil, SESION } from '../tests/utilidades.jsx';

async function completarFormulario({ confirmacion = 'ClaveSegura123' } = {}) {
  await userEvent.type(screen.getByLabelText('Nombre completo'), 'Ana Pérez');
  await userEvent.type(screen.getByLabelText('Correo electrónico'), 'ana@correo.cl');
  await userEvent.type(screen.getByLabelText('Contraseña (mínimo 8 caracteres)'), 'ClaveSegura123');
  await userEvent.type(screen.getByLabelText('Confirmar contraseña'), confirmacion);
}

describe('Registro (FS-HU-01 y FS-HU-17)', () => {
  // Desde el 24-09-2026 el registro no pregunta el rol: el tipo de cuenta se elige en el asistente de perfil.
  test('FS-HU-17 escenario 1: registra la cuenta y lleva al primer paso del asistente', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch').mockImplementation((url) => (url === '/api/auth/registro'
      ? respuestaJson(201, SESION)
      : respuestaJson(200, respuestaPerfil({ tipoCuenta: false }))));
    renderizarApp('/registro');

    await completarFormulario();
    await userEvent.click(screen.getByRole('button', { name: 'Registrarse' }));

    expect(await screen.findByText('Tu cuenta fue creada y la sesión está iniciada.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Tipo de cuenta' })).toBeInTheDocument();
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({
      nombre: 'Ana Pérez', correo: 'ana@correo.cl', password: 'ClaveSegura123' });
  });

  test('el registro no pide elegir el rol', async () => {
    renderizarApp('/registro');

    expect(screen.queryByText('¿Cuál es tu rol?')).not.toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: /Profesional/ })).not.toBeInTheDocument();
  });

  test('FS-HU-17 escenario 2: con contraseñas distintas no envía el registro', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch');
    renderizarApp('/registro');

    await completarFormulario({ confirmacion: 'OtraClave999' });
    await userEvent.click(screen.getByRole('button', { name: 'Registrarse' }));

    expect(screen.getByText('Las contraseñas no coinciden')).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  test('no muestra términos ni la opción de Apple', () => {
    renderizarApp('/registro');

    expect(screen.queryByText(/Términos/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Apple/i)).not.toBeInTheDocument();
  });
});

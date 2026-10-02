import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { renderizarApp, respuestaJson, SESION } from '../tests/utilidades.jsx';

const PERFIL_VACIO = { usuario: SESION.usuario, perfil: { pesoKg: null, alturaCm: null, edad: null, sexo: null, actividadFisica: null }, completo: false, requerimientoCaloricoKcal: null };

describe('Datos básicos del perfil (FS-HU-02)', () => {
  beforeEach(() => localStorage.setItem('fitsearch_sesion', JSON.stringify(SESION)));

  test('escenario 1: guarda los datos básicos y muestra la estimación del requerimiento calórico', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch').mockImplementation((url, opciones) => (opciones.method === 'PUT'
      ? respuestaJson(200, { usuario: SESION.usuario, perfil: JSON.parse(opciones.body), completo: true, requerimientoCaloricoKcal: 2556 })
      : respuestaJson(200, PERFIL_VACIO)));
    renderizarApp('/perfil');

    expect(await screen.findByText(/Completa tus datos básicos/)).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Peso (kg)'), '70.5');
    await userEvent.type(screen.getByLabelText('Altura (cm)'), '175');
    await userEvent.type(screen.getByLabelText('Edad (años)'), '30');
    await userEvent.selectOptions(screen.getByLabelText('Sexo'), 'masculino');
    await userEvent.selectOptions(screen.getByLabelText('Actividad física'), 'moderada');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar datos' }));

    expect(await screen.findByText('Tus datos básicos se guardaron correctamente.')).toBeInTheDocument();
    const [, opcionesPut] = fetch.mock.calls.find(([, opciones]) => opciones.method === 'PUT');
    expect(JSON.parse(opcionesPut.body)).toEqual({ pesoKg: 70.5, alturaCm: 175, edad: 30, sexo: 'masculino', actividadFisica: 'moderada' });
    expect(screen.getByText('Requerimiento calórico diario estimado')).toBeInTheDocument();
    expect(screen.getByText(/2\.556 kcal/)).toBeInTheDocument();
    expect(opcionesPut.headers.Authorization).toBe('Bearer token-de-prueba');
    expect(screen.queryByText(/Completa tus datos básicos/)).not.toBeInTheDocument();
  });

  test('escenario 2: con campos vacíos no guarda y señala qué campos faltan', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch').mockReturnValue(respuestaJson(200, PERFIL_VACIO));
    renderizarApp('/perfil');

    await userEvent.type(await screen.findByLabelText('Peso (kg)'), '70');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar datos' }));

    expect(screen.getByText('La altura es obligatoria')).toBeInTheDocument();
    expect(screen.getByText('La edad es obligatoria')).toBeInTheDocument();
    expect(screen.getByText('El sexo es obligatorio para el cálculo nutricional')).toBeInTheDocument();
    expect(screen.getByText('El nivel de actividad física es obligatorio')).toBeInTheDocument();
    expect(fetch.mock.calls.some(([, opciones]) => opciones.method === 'PUT')).toBe(false);
  });

  test('si el token expiró, cierra la sesión y avisa al usuario', async () => {
    vi.spyOn(globalThis, 'fetch').mockReturnValue(respuestaJson(401, { error: 'La sesión es inválida o expiró' }));
    renderizarApp('/perfil');

    expect(await screen.findByText('Tu sesión expiró. Inicia sesión nuevamente.')).toBeInTheDocument();
    expect(localStorage.getItem('fitsearch_sesion')).toBeNull();
  });
});

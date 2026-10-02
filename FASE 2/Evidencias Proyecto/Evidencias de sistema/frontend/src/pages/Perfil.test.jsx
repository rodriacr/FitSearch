import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { PERFIL_COMPLETO, renderizarApp, respuestaJson, respuestaPerfil, SESION } from '../tests/utilidades.jsx';

// Servidor simulado: guarda lo que recibe cada PUT y responde el perfil actualizado, como la API real.
function simularServidor(inicial = {}) {
  const estado = { ...inicial };
  return vi.spyOn(globalThis, 'fetch').mockImplementation((url, opciones) => {
    const cuerpo = opciones.body ? JSON.parse(opciones.body) : null;
    if (opciones.method === 'PUT' && url === '/api/perfil/tipo-cuenta') {
      estado.tipoCuenta = true;
      estado.usuario = { ...SESION.usuario, rol: cuerpo.rol };
    }
    if (opciones.method === 'PUT' && url === '/api/perfil') estado.perfil = cuerpo;
    if (opciones.method === 'PUT' && url === '/api/perfil/objetivos') estado.objetivos = cuerpo;
    if (opciones.method === 'PUT' && url === '/api/perfil/salud') estado.salud = cuerpo;
    const completo = estado.perfil && Object.values(estado.perfil).every((valor) => valor !== null);
    const respuesta = respuestaPerfil({ ...estado, requerimientoCaloricoKcal: completo ? 2556 : null });
    // Al confirmar el tipo de cuenta la API devuelve un token nuevo, porque el rol viaja dentro del token.
    if (url === '/api/perfil/tipo-cuenta') respuesta.token = 'token-con-rol-nuevo';
    return respuestaJson(200, respuesta);
  });
}
const cuerpoDe = (fetch, url) => JSON.parse(fetch.mock.calls.find(([u, o]) => u === url && o.method === 'PUT')[1].body);
const huboPut = (fetch) => fetch.mock.calls.some(([, opciones]) => opciones.method === 'PUT');
const siguiente = () => userEvent.click(screen.getByRole('button', { name: 'Siguiente' }));

describe('Asistente de perfil: paso 1, tipo de cuenta (FS-HU-02)', () => {
  beforeEach(() => localStorage.setItem('fitsearch_sesion', JSON.stringify(SESION)));

  test('una cuenta nueva elige su tipo de cuenta y recién entonces pasa a los datos personales', async () => {
    const fetch = simularServidor({ tipoCuenta: false });
    renderizarApp('/perfil');

    expect(await screen.findByRole('heading', { name: 'Tipo de cuenta' })).toBeInTheDocument();
    // Nada viene marcado: la elección tiene que ser explícita.
    expect(screen.getByRole('radio', { name: /Usuario/ })).not.toBeChecked();
    expect(screen.getByRole('radio', { name: /Profesional/ })).not.toBeChecked();
    await userEvent.click(screen.getByRole('radio', { name: /Profesional/ }));
    await siguiente();

    expect(await screen.findByRole('heading', { name: 'Datos personales' })).toBeInTheDocument();
    expect(cuerpoDe(fetch, '/api/perfil/tipo-cuenta')).toEqual({ rol: 'profesional' });
    // La sesión guardada queda con el token nuevo y el rol actualizado.
    const guardada = JSON.parse(localStorage.getItem('fitsearch_sesion'));
    expect(guardada.token).toBe('token-con-rol-nuevo');
    expect(guardada.usuario.rol).toBe('profesional');
  });

  test('sin elegir el tipo de cuenta no guarda ni avanza', async () => {
    const fetch = simularServidor({ tipoCuenta: false });
    renderizarApp('/perfil');

    await screen.findByRole('heading', { name: 'Tipo de cuenta' });
    await siguiente();

    expect(screen.getByText('Selecciona el tipo de cuenta')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Tipo de cuenta' })).toBeInTheDocument();
    expect(huboPut(fetch)).toBe(false);
  });

  test('desde el resumen se puede corregir el tipo de cuenta', async () => {
    const fetch = simularServidor(PERFIL_COMPLETO);
    renderizarApp('/perfil');

    expect(await screen.findByRole('heading', { name: 'Hola, Ana Pérez' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Editar tipo de cuenta' }));

    expect(screen.getByRole('heading', { name: 'Tipo de cuenta' })).toBeInTheDocument();
    // Al editar sí viene marcado lo que la persona eligió antes.
    expect(screen.getByRole('radio', { name: /Usuario/ })).toBeChecked();
    await userEvent.click(screen.getByRole('radio', { name: /Profesional/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(await screen.findByText('Tus cambios se guardaron correctamente.')).toBeInTheDocument();
    expect(cuerpoDe(fetch, '/api/perfil/tipo-cuenta')).toEqual({ rol: 'profesional' });
    // Queda actualizado en la etiqueta del encabezado y en la tarjeta del resumen.
    expect(screen.getAllByText('Profesional')).toHaveLength(2);
  });
});

describe('Asistente de perfil: paso 2, datos personales (FS-HU-02)', () => {
  beforeEach(() => localStorage.setItem('fitsearch_sesion', JSON.stringify(SESION)));

  test('escenario 1: un usuario nuevo completa sus datos básicos y avanza al paso siguiente', async () => {
    const fetch = simularServidor();
    renderizarApp('/perfil');

    expect(await screen.findByRole('heading', { name: 'Datos personales' })).toBeInTheDocument();
    expect(screen.getByText('El peso debe estar entre 20 y 350 kg')).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Peso (kg)'), '70.5');
    await userEvent.type(screen.getByLabelText('Altura (cm)'), '175');
    await userEvent.type(screen.getByLabelText('Edad (años)'), '30');
    await userEvent.selectOptions(screen.getByLabelText('Sexo'), 'masculino');
    await userEvent.selectOptions(screen.getByLabelText('Actividad física'), 'moderada');
    await siguiente();

    expect(await screen.findByRole('heading', { name: 'Objetivos y estilo de vida' })).toBeInTheDocument();
    expect(cuerpoDe(fetch, '/api/perfil')).toEqual({ pesoKg: 70.5, alturaCm: 175, edad: 30, sexo: 'masculino', actividadFisica: 'moderada' });
    const [, opcionesPut] = fetch.mock.calls.find(([, opciones]) => opciones.method === 'PUT');
    expect(opcionesPut.headers.Authorization).toBe('Bearer token-de-prueba');
  });

  test('escenario 2: con campos vacíos no guarda y señala qué campos faltan', async () => {
    const fetch = simularServidor();
    renderizarApp('/perfil');

    await userEvent.type(await screen.findByLabelText('Peso (kg)'), '70');
    await siguiente();

    expect(screen.getByText('La altura es obligatoria')).toBeInTheDocument();
    expect(screen.getByText('La edad es obligatoria')).toBeInTheDocument();
    expect(screen.getByText('El sexo es obligatorio para el cálculo nutricional')).toBeInTheDocument();
    expect(screen.getByText('El nivel de actividad física es obligatorio')).toBeInTheDocument();
    expect(huboPut(fetch)).toBe(false);
  });

  test('si el token expiró, cierra la sesión y avisa al usuario', async () => {
    vi.spyOn(globalThis, 'fetch').mockReturnValue(respuestaJson(401, { error: 'La sesión es inválida o expiró' }));
    renderizarApp('/perfil');

    expect(await screen.findByText('Tu sesión expiró. Inicia sesión nuevamente.')).toBeInTheDocument();
    expect(localStorage.getItem('fitsearch_sesion')).toBeNull();
  });
});

describe('Asistente de perfil: paso 3, objetivos y estilo de vida (FS-HU-18)', () => {
  beforeEach(() => localStorage.setItem('fitsearch_sesion', JSON.stringify(SESION)));

  test('escenario 1: elige el objetivo, las comidas y el sueño, y avanza al paso de salud', async () => {
    const fetch = simularServidor({ perfil: PERFIL_COMPLETO.perfil });
    renderizarApp('/perfil');

    expect(await screen.findByRole('heading', { name: 'Objetivos y estilo de vida' })).toBeInTheDocument();
    await userEvent.click(screen.getByLabelText('Aumentar masa muscular'));
    await userEvent.selectOptions(screen.getByLabelText('¿Cuántas comidas realizas al día?'), '4');
    await userEvent.selectOptions(screen.getByLabelText('Horas de sueño promedio'), '7_8');
    await siguiente();

    expect(await screen.findByRole('heading', { name: 'Información de salud' })).toBeInTheDocument();
    expect(cuerpoDe(fetch, '/api/perfil/objetivos')).toEqual({ objetivoPrincipal: 'aumentar_masa', comidasDia: 4, horasSueno: '7_8' });
  });

  test('escenario 2: sin responder no guarda y "Volver" regresa a los datos personales', async () => {
    const fetch = simularServidor({ perfil: PERFIL_COMPLETO.perfil });
    renderizarApp('/perfil');

    await screen.findByRole('heading', { name: 'Objetivos y estilo de vida' });
    await siguiente();

    expect(screen.getByText('Elige tu objetivo principal')).toBeInTheDocument();
    expect(screen.getByText('Indica cuántas comidas realizas al día')).toBeInTheDocument();
    expect(screen.getByText('Indica tus horas de sueño promedio')).toBeInTheDocument();
    expect(huboPut(fetch)).toBe(false);
    await userEvent.click(screen.getByRole('button', { name: 'Volver' }));
    expect(screen.getByRole('heading', { name: 'Datos personales' })).toBeInTheDocument();
  });
});

describe('Asistente de perfil: paso 4, información de salud (FS-HU-19), y resumen', () => {
  beforeEach(() => localStorage.setItem('fitsearch_sesion', JSON.stringify(SESION)));

  test('escenario 1: guarda la información de salud, muestra la estimación y el resumen del perfil', async () => {
    const fetch = simularServidor({ perfil: PERFIL_COMPLETO.perfil, objetivos: PERFIL_COMPLETO.objetivos });
    renderizarApp('/perfil');

    expect(await screen.findByRole('heading', { name: 'Información de salud' })).toBeInTheDocument();
    await userEvent.click(screen.getByLabelText('Diabetes'));
    await userEvent.click(screen.getByLabelText('Hipertensión arterial'));
    await userEvent.click(screen.getByRole('radio', { name: 'Sí' }));
    await userEvent.click(screen.getByLabelText('Para la presión arterial'));
    const alergias = within(screen.getByRole('group', { name: 'Alergias' }));
    await userEvent.click(alergias.getByLabelText('Alimentarias'));
    await userEvent.click(alergias.getByLabelText('Ninguna'));
    expect(alergias.getByLabelText('Alimentarias')).not.toBeChecked();
    await siguiente();

    expect(await screen.findByRole('heading', { name: '¡Información guardada!' })).toBeInTheDocument();
    expect(cuerpoDe(fetch, '/api/perfil/salud')).toEqual({
      condicionesMedicas: ['diabetes', 'hipertension'], tomaMedicamentos: true, medicamentos: ['presion'], alergias: ['ninguna'] });
    expect(screen.getByText(/2\.556 kcal/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Ir a mi perfil' }));
    expect(screen.getByRole('heading', { name: 'Hola, Ana Pérez' })).toBeInTheDocument();
    expect(screen.getByText('Diabetes, Hipertensión arterial')).toBeInTheDocument();
    expect(screen.getByText('Para la presión arterial')).toBeInTheDocument();
    expect(screen.getByText(/2\.556 kcal/)).toBeInTheDocument();
  });

  test('escenario 2: sin responder no guarda y señala cada pregunta', async () => {
    const fetch = simularServidor({ perfil: PERFIL_COMPLETO.perfil, objetivos: PERFIL_COMPLETO.objetivos });
    renderizarApp('/perfil');

    await screen.findByRole('heading', { name: 'Información de salud' });
    await siguiente();

    expect(screen.getByText('Indica si tienes alguna condición médica (o marca "Ninguna")')).toBeInTheDocument();
    expect(screen.getByText('Indica si tomas algún medicamento regularmente')).toBeInTheDocument();
    expect(screen.getByText('Indica si tienes alergias (o marca "Ninguna")')).toBeInTheDocument();
    expect(huboPut(fetch)).toBe(false);
  });

  test('con el perfil completo muestra el resumen y "Editar" permite cambiar una sección', async () => {
    const fetch = simularServidor(PERFIL_COMPLETO);
    renderizarApp('/perfil');

    expect(await screen.findByRole('heading', { name: 'Hola, Ana Pérez' })).toBeInTheDocument();
    expect(screen.getByText('Bajar de peso')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Editar objetivos y estilo de vida' }));

    expect(screen.getByRole('heading', { name: 'Objetivos y estilo de vida' })).toBeInTheDocument();
    expect(screen.getByLabelText('Bajar de peso')).toBeChecked();
    await userEvent.click(screen.getByLabelText('Mejorar rendimiento'));
    await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(await screen.findByText('Tus cambios se guardaron correctamente.')).toBeInTheDocument();
    expect(screen.getByText('Mejorar rendimiento')).toBeInTheDocument();
    expect(cuerpoDe(fetch, '/api/perfil/objetivos').objetivoPrincipal).toBe('mejorar_rendimiento');
  });

  test('"Cancelar" en la edición vuelve al resumen sin guardar', async () => {
    const fetch = simularServidor(PERFIL_COMPLETO);
    renderizarApp('/perfil');

    await userEvent.click(await screen.findByRole('button', { name: 'Editar información de salud' }));
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(screen.getByRole('heading', { name: 'Hola, Ana Pérez' })).toBeInTheDocument();
    expect(huboPut(fetch)).toBe(false);
  });
});

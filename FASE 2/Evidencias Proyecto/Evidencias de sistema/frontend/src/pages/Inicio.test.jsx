// Inicio del usuario con sesión según el mockup (FS-HU-21): datos reales de la API y estados vacíos.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test } from 'vitest';
import {
  fichaProfesional, listado, llamadasA, parametrosDe, PERFIL_COMPLETO, renderizarApp, respuestaPerfil, SESION, simularApi,
} from '../tests/utilidades.jsx';

beforeEach(() => sessionStorage.setItem('fitsearch_sesion', JSON.stringify(SESION)));

const destacados = [
  fichaProfesional({ id: 4, nombre: 'Matías Demo', especialidad: 'Entrenamiento personal', comuna: 'Santiago', calificacion: { promedio: 4.8, total: 4 } }),
  fichaProfesional({ id: 6, nombre: 'Felipe Demo', especialidad: 'Kinesiología', comuna: 'Providencia', esFavorito: true }),
];
function simular({ perfil = respuestaPerfil(PERFIL_COMPLETO), profesionales = listado(destacados), extra = {} } = {}) {
  return simularApi({
    '/api/perfil': perfil,
    '/api/profesionales/filtros': { especialidades: [], comunas: [] },
    '/api/profesionales': profesionales,
    ...extra,
  });
}

describe('Inicio con datos', () => {
  test('muestra el hero, los accesos rápidos, el objetivo, la meta de calorías y los profesionales destacados de la API', async () => {
    const fetch = simular();
    renderizarApp('/inicio');

    expect(screen.getByRole('heading', { level: 1, name: 'Tu salud y bienestar, en un solo lugar' })).toBeInTheDocument();
    const accesos = screen.getByRole('heading', { name: 'Tus accesos rápidos' }).closest('section');
    for (const [nombre, ruta] of [['Profesionales', '/profesionales'], ['Centros de salud', '/centros-salud'], ['Gimnasios', '/gimnasios'], ['Farmacias', '/farmacias'], ['Asistente IA', '/asistente']]) {
      expect(within(accesos).getByRole('link', { name: new RegExp(`^${nombre}`) })).toHaveAttribute('href', ruta);
    }
    expect(within(accesos).getAllByText('Próximamente')).toHaveLength(4);

    expect(await screen.findByText('Bajar de peso')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Ver detalle de objetivos/ })).toHaveAttribute('href', '/perfil');
    const progreso = screen.getByRole('heading', { name: 'Tu progreso' }).closest('section');
    expect(within(progreso).getByText('/ 2.556 kcal')).toBeInTheDocument();
    expect(within(progreso).getAllByText('Próximamente')).toHaveLength(3);

    expect(await screen.findByRole('heading', { name: 'Matías Demo' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Calificación 4,8 de 5, 4 reseñas' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Ver todos/ })).toHaveAttribute('href', '/profesionales');
    expect(parametrosDe(llamadasA(fetch, '/api/profesionales?')[0][0])).toEqual({ orden: 'destacados', limite: '4' });
  });

  test('las próximas citas muestran un estado vacío con su acción (las reservas llegan con FS-HU-14)', async () => {
    simular(); renderizarApp('/inicio');
    const citas = screen.getByRole('heading', { name: 'Próximas citas' }).closest('section');
    expect(within(citas).getByText('Aún no tienes citas agendadas')).toBeInTheDocument();
    expect(within(citas).getByRole('link', { name: 'Buscar profesionales' })).toHaveAttribute('href', '/profesionales');
    expect(within(citas).getByRole('link', { name: 'Ver todas' })).toHaveAttribute('href', '/citas');
  });

  test('el buscador "¿Qué necesitas hoy?" lleva a /profesionales con el texto', async () => {
    const fetch = simular(); renderizarApp('/inicio');
    await userEvent.type(screen.getByRole('searchbox', { name: '¿Qué necesitas hoy?' }), 'dolor de rodilla');
    await userEvent.click(screen.getByRole('button', { name: 'Buscar profesionales' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Profesionales' })).toBeInTheDocument();
    expect(screen.getByRole('searchbox', { name: 'Buscar profesionales' })).toHaveValue('dolor de rodilla');
    await waitFor(() => expect(llamadasA(fetch, '/api/profesionales?q=').length).toBeGreaterThan(0));
  });

  test('el corazón de un destacado guarda el favorito en la API', async () => {
    const fetch = simular({ extra: { '/api/favoritos': (url, { method }) => [200, { profesionalId: 4, esFavorito: method === 'PUT' }] } });
    renderizarApp('/inicio');
    const boton = await screen.findByRole('button', { name: 'Guardar a Matías Demo en favoritos' });
    expect(boton).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(boton);
    await waitFor(() => expect(boton).toHaveAttribute('aria-pressed', 'true'));
    expect(llamadasA(fetch, '/api/favoritos/4')[0][1].method).toBe('PUT');
    expect(screen.getByRole('button', { name: 'Guardar a Felipe Demo en favoritos' })).toHaveAttribute('aria-pressed', 'true');
  });

  test('si la API rechaza el favorito, el corazón vuelve a su estado y explica el error', async () => {
    simular({ extra: { '/api/favoritos': () => [500, { error: 'No pudimos guardar tu favorito' }] } });
    renderizarApp('/inicio');
    const boton = await screen.findByRole('button', { name: 'Guardar a Matías Demo en favoritos' });
    await userEvent.click(boton);
    expect(await screen.findByText('No pudimos guardar tu favorito')).toBeInTheDocument();
    expect(boton).toHaveAttribute('aria-pressed', 'false');
  });
});

describe('Inicio sin datos', () => {
  test('sin objetivo, sin datos personales y sin profesionales muestra estados vacíos con su acción', async () => {
    simular({ perfil: respuestaPerfil(), profesionales: listado([]) });
    renderizarApp('/inicio');

    expect(await screen.findByText('Aún no defines tu objetivo')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Definir mi objetivo' })).toHaveAttribute('href', '/perfil');
    expect(screen.getByRole('link', { name: 'Completa tus datos para estimar tu meta' })).toHaveAttribute('href', '/perfil');
    expect(await screen.findByText('Aún no hay profesionales destacados')).toBeInTheDocument();
    // Faltan datos personales, objetivos y salud: se invita a completar el perfil.
    expect(screen.getByText(/Te faltan 3 pasos para completar tu perfil/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Completar mi perfil' })).toHaveAttribute('href', '/perfil');
  });

  test('con el tipo de cuenta pendiente lleva al asistente de perfil', async () => {
    simular({ perfil: respuestaPerfil({ tipoCuenta: false }) });
    renderizarApp('/inicio');
    expect(await screen.findByRole('heading', { name: 'Tipo de cuenta' })).toBeInTheDocument();
  });

  test('si falla la carga del perfil, permite reintentar', async () => {
    // StrictMode carga dos veces al montar: fallan las dos primeras consultas.
    let intentos = 0;
    simular({ extra: { '/api/perfil': () => { intentos += 1; return intentos <= 2 ? [500, { error: 'Error del servidor' }] : [200, respuestaPerfil(PERFIL_COMPLETO)]; } } });
    renderizarApp('/inicio');
    await userEvent.click((await screen.findAllByRole('button', { name: 'Reintentar' }))[0]);
    expect(await screen.findByText('Bajar de peso')).toBeInTheDocument();
  });

  test('sin sesión pide iniciar sesión', () => {
    sessionStorage.clear();
    renderizarApp('/inicio');
    expect(screen.getByRole('heading', { name: '¡Bienvenido!' })).toBeInTheDocument();
  });
});

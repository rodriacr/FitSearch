// Profesionales favoritos (FS-HU-23).
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, test } from 'vitest';
import { fichaProfesional, listado, llamadasA, renderizarApp, SESION, simularApi } from '../tests/utilidades.jsx';

beforeEach(() => sessionStorage.setItem('fitsearch_sesion', JSON.stringify(SESION)));

test('lista los favoritos y al quitar uno desaparece de la lista', async () => {
  const fetch = simularApi({
    '/api/favoritos/': (url, { method }) => [200, { profesionalId: 1, esFavorito: method === 'PUT' }],
    '/api/favoritos': listado([fichaProfesional({ esFavorito: true }), fichaProfesional({ id: 2, nombre: 'Camila Demo', esFavorito: true })]),
  });
  renderizarApp('/favoritos');

  expect(await screen.findByRole('heading', { level: 2, name: 'Ana Demo' })).toBeInTheDocument();
  expect(screen.getByText('2 profesionales guardados')).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Guardar a Ana Demo en favoritos', pressed: true }));
  await waitFor(() => expect(screen.queryByRole('heading', { name: 'Ana Demo' })).not.toBeInTheDocument());
  expect(screen.getByText('1 profesional guardado')).toBeInTheDocument();
  expect(llamadasA(fetch, '/api/favoritos/1')[0][1].method).toBe('DELETE');
});

test('sin favoritos explica cómo guardarlos y ofrece explorar profesionales', async () => {
  simularApi({ '/api/favoritos': listado([]) });
  renderizarApp('/favoritos');
  expect(await screen.findByRole('heading', { name: 'Aún no tienes profesionales favoritos' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Explorar profesionales' })).toHaveAttribute('href', '/profesionales');
});

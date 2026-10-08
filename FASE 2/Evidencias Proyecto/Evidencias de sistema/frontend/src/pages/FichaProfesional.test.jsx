// Ficha del profesional con favorito y reseñas (FS-HU-23, FS-HU-24).
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test } from 'vitest';
import { fichaProfesional, FILTROS, listado, llamadasA, MI_FICHA, renderizarApp, SESION, SESION_PROFESIONAL, simularApi } from '../tests/utilidades.jsx';

beforeEach(() => sessionStorage.setItem('fitsearch_sesion', JSON.stringify(SESION)));

const RESUMEN = { promedio: 4.5, total: 2, distribucion: { 5: 1, 4: 1, 3: 0, 2: 0, 1: 0 } };
const resenaDe = (sobrescribir = {}) => ({ id: 9, autor: 'Valeria D.', puntaje: 5, comentario: 'Muy clara al explicar el plan.', fecha: '2026-10-01T15:00:00.000Z', propia: false, ...sobrescribir });
const fichaApi = (sobrescribir = {}) => ({
  profesional: fichaProfesional({ calificacion: { promedio: 4.5, total: 2 } }), resumenResenas: RESUMEN, miResena: null, puedeResenar: true, ...sobrescribir,
});

function simular({ ficha = fichaApi(), resenas = [resenaDe(), resenaDe({ id: 10, autor: 'Martín D.', puntaje: 4, comentario: null })], guardar, eliminar } = {}) {
  return simularApi({
    '/api/profesionales/1/resenas': (url, { method = 'GET' }) => {
      if (method === 'PUT') return guardar ? guardar(url) : [201, { resena: resenaDe({ id: 20, autor: 'Ana P.', puntaje: 4, comentario: 'Excelente atención', propia: true }), resumenResenas: { promedio: 4.3, total: 3, distribucion: { 5: 1, 4: 2, 3: 0, 2: 0, 1: 0 } } }];
      if (method === 'DELETE') return eliminar ? eliminar() : [200, { resumenResenas: RESUMEN }];
      return [200, { resenas, pagina: 1, total: resenas.length, totalPaginas: 1 }];
    },
    '/api/profesionales/1': () => (ficha.estado ? [ficha.estado, { error: 'No encontramos este profesional' }] : [200, ficha]),
    '/api/profesionales/filtros': FILTROS,
    '/api/profesionales/mi-ficha': { ficha: { ...MI_FICHA, id: 1 } },
    '/api/profesionales': listado(),
  });
}
const cuerpo = (llamada) => JSON.parse(llamada[1].body);

describe('Ficha', () => {
  test('muestra los datos públicos, el resumen de calificaciones y las reseñas', async () => {
    simular(); renderizarApp('/profesionales/1');

    expect(await screen.findByRole('heading', { level: 1, name: 'Ana Demo' })).toBeInTheDocument();
    expect(screen.getByText('Presencial y online')).toBeInTheDocument();
    expect(screen.getByText('Consulta Demo')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Ver ubicación de Ana Demo en Google Maps/ }))
      .toHaveAttribute('href', 'https://www.google.com/maps/search/?api=1&query=-33.686%2C-71.215');
    expect(screen.getByText('2 reseñas')).toBeInTheDocument();
    expect(await screen.findByText('Muy clara al explicar el plan.')).toBeInTheDocument();
    expect(screen.getByText('Martín D.')).toBeInTheDocument();
    expect(screen.queryByText(/@/)).not.toBeInTheDocument();
  });

  test('"Volver a profesionales" regresa a la misma búsqueda desde la que se abrió', async () => {
    simular(); renderizarApp('/profesionales?q=nutri');
    await userEvent.click(await screen.findByRole('link', { name: 'Ana Demo' }));
    await screen.findByRole('heading', { level: 1, name: 'Ana Demo' });
    await userEvent.click(screen.getByRole('link', { name: 'Volver a profesionales' }));
    expect(await screen.findByRole('searchbox', { name: 'Buscar profesionales' })).toHaveValue('nutri');
  });

  test('si el profesional no existe lo indica con una salida', async () => {
    simular({ ficha: { estado: 404 } }); renderizarApp('/profesionales/1');
    expect(await screen.findByRole('heading', { name: 'No encontramos este profesional' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver profesionales' })).toHaveAttribute('href', '/profesionales');
  });
});

describe('Calificar (FS-HU-24)', () => {
  test('escenario 1: publica una reseña con estrellas y comentario y actualiza el resumen', async () => {
    const fetch = simular(); renderizarApp('/profesionales/1');
    expect(await screen.findByRole('heading', { name: 'Califica a Ana Demo' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('radio', { name: '4 estrellas' }));
    await userEvent.type(screen.getByLabelText('Comentario (opcional)'), '  Excelente atención  ');
    await userEvent.click(screen.getByRole('button', { name: 'Publicar reseña' }));

    expect(await screen.findByText('¡Gracias! Tu reseña fue publicada.')).toBeInTheDocument();
    expect(cuerpo(llamadasA(fetch, '/api/profesionales/1/resenas').find(([, opciones]) => opciones.method === 'PUT')))
      .toEqual({ puntaje: 4, comentario: 'Excelente atención' });
    expect(screen.getByText('3 reseñas')).toBeInTheDocument();
    expect(screen.getByText('Tu reseña', { selector: '.resena__etiqueta' })).toBeInTheDocument();
  });

  test('escenario 2: sin estrellas o con un comentario muy corto no envía la reseña', async () => {
    const fetch = simular(); renderizarApp('/profesionales/1');
    await screen.findByRole('heading', { name: 'Califica a Ana Demo' });
    await userEvent.click(screen.getByRole('button', { name: 'Publicar reseña' }));
    expect(screen.getByText('Elige una calificación de 1 a 5 estrellas')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('radio', { name: '5 estrellas' }));
    await userEvent.type(screen.getByLabelText('Comentario (opcional)'), 'Bien');
    await userEvent.click(screen.getByRole('button', { name: 'Publicar reseña' }));
    expect(screen.getByText(/al menos 10 caracteres/)).toBeInTheDocument();
    expect(llamadasA(fetch, '/api/profesionales/1/resenas').some(([, opciones]) => opciones.method === 'PUT')).toBe(false);
  });

  test('escenario 3: edita y elimina su propia reseña, con confirmación', async () => {
    const propia = resenaDe({ id: 20, autor: 'Ana P.', puntaje: 3, comentario: 'Atención correcta.', propia: true });
    const fetch = simular({
      ficha: fichaApi({ miResena: propia }),
      guardar: () => [200, { resena: { ...propia, puntaje: 5 }, resumenResenas: RESUMEN }],
    });
    renderizarApp('/profesionales/1');

    const tarjeta = (await screen.findByText('Tu reseña', { selector: '.resena__etiqueta' })).closest('.resena');
    expect(within(tarjeta).getByText('Atención correcta.')).toBeInTheDocument();
    await userEvent.click(within(tarjeta).getByRole('button', { name: 'Editar' }));
    expect(screen.getByRole('radio', { name: '3 estrellas' })).toBeChecked();
    await userEvent.click(screen.getByRole('radio', { name: '5 estrellas' }));
    await userEvent.click(screen.getByRole('button', { name: 'Actualizar reseña' }));
    expect(await screen.findByText('Tu reseña fue actualizada.')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Eliminar' }));
    await userEvent.click(screen.getByRole('button', { name: 'Sí, eliminar' }));
    expect(await screen.findByText('Tu reseña fue eliminada.')).toBeInTheDocument();
    expect(llamadasA(fetch, '/api/profesionales/1/resenas').some(([, opciones]) => opciones.method === 'DELETE')).toBe(true);
    expect(await screen.findByRole('heading', { name: 'Califica a Ana Demo' })).toBeInTheDocument();
  });

  test('en la vista previa de su propia ficha, el profesional ve las reseñas pero no puede calificar ni guardarse en favoritos', async () => {
    sessionStorage.setItem('fitsearch_sesion', JSON.stringify(SESION_PROFESIONAL));
    simular({ ficha: fichaApi({ puedeResenar: false }) });
    renderizarApp('/profesional/perfil/publico');
    expect(await screen.findByText('Solo las cuentas de usuario pueden calificar a profesionales.')).toBeInTheDocument();
    expect(screen.getByText('Así ven tu ficha las personas que buscan profesionales en FitSearch.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Publicar reseña' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /favoritos/i })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Volver a mi perfil/ })).toHaveAttribute('href', '/profesional/perfil');
    await waitFor(() => expect(screen.getByText('Valeria D.')).toBeInTheDocument());
  });

  test('sin reseñas invita a dejar la primera', async () => {
    simular({ ficha: fichaApi({ resumenResenas: { promedio: null, total: 0, distribucion: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } } }), resenas: [] });
    renderizarApp('/profesionales/1');
    expect(await screen.findByText('Este profesional aún no tiene reseñas')).toBeInTheDocument();
    expect(screen.getByText('¡Sé la primera persona en dejar una reseña!')).toBeInTheDocument();
  });
});

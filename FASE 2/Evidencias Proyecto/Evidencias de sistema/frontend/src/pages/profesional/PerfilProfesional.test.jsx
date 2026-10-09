// "Perfil profesional" (FS-HU-04): ficha propia con su formulario, pestañas y vista previa de la ficha pública.
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { fichaProfesional, MI_FICHA, renderizarApp, respuestaJson, SESION_PROFESIONAL } from '../../tests/utilidades.jsx';

const NUEVA = {
  especialidad: 'Nutrición', descripcion: 'Atención nutricional', comuna: 'Ñuñoa', modalidad: 'ambas', ubicacionLat: -33.4569, ubicacionLng: -70.5976,
};
const RESUMEN_VACIO = { promedio: null, total: 0, distribucion: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } };

// Servidor simulado: la ficha propia (null hasta que se guarda) y su ficha pública por id.
function simularServidor({ ficha = null, alGuardar } = {}) {
  const estado = { ficha };
  return vi.spyOn(globalThis, 'fetch').mockImplementation((url, opciones = {}) => {
    if (url === '/api/profesionales/mi-ficha' && opciones.method === 'PUT') {
      if (alGuardar) return alGuardar();
      estado.ficha = { id: 3, ...JSON.parse(opciones.body) };
      return respuestaJson(200, { ficha: estado.ficha });
    }
    if (url === '/api/profesionales/mi-ficha') return respuestaJson(200, { ficha: estado.ficha });
    if (url === `/api/profesionales/${estado.ficha?.id}`) {
      const { id, ...datos } = estado.ficha;
      return respuestaJson(200, {
        profesional: fichaProfesional({ id, nombre: 'Matías Rojas', ...datos, establecimiento: null, calificacion: { promedio: 4.8, total: 5 } }),
        resumenResenas: RESUMEN_VACIO, miResena: null, puedeResenar: false,
      });
    }
    return respuestaJson(404, { error: 'Recurso no encontrado' });
  });
}
const cuerpoPut = (fetch) => JSON.parse(fetch.mock.calls.find(([url, o]) => url === '/api/profesionales/mi-ficha' && o.method === 'PUT')[1].body);
const huboPut = (fetch) => fetch.mock.calls.some(([, opciones = {}]) => opciones.method === 'PUT');

async function completarFicha() {
  await userEvent.selectOptions(screen.getByLabelText('Especialidad (obligatorio)'), 'Nutrición');
  await userEvent.type(screen.getByLabelText('Descripción sobre tu atención'), 'Atención nutricional');
  await userEvent.selectOptions(screen.getByLabelText('Modalidad de atención (obligatorio)'), 'ambas');
  await userEvent.type(screen.getByLabelText('Comuna (obligatorio)'), 'Ñuñoa');
  await userEvent.type(screen.getByLabelText('Latitud'), '-33.4569');
  await userEvent.type(screen.getByLabelText('Longitud'), '-70.5976');
}

beforeEach(() => sessionStorage.setItem('fitsearch_sesion', JSON.stringify(SESION_PROFESIONAL)));

describe('Sin ficha', () => {
  test('muestra el formulario directamente, sin "Cancelar", y al guardar muestra el perfil', async () => {
    const fetch = simularServidor();
    renderizarApp('/profesional/perfil');

    expect(await screen.findByRole('heading', { name: 'Configura tu perfil profesional' })).toBeInTheDocument();
    expect(screen.getByText('Completa tu ficha para aparecer en el buscador de FitSearch.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cancelar' })).not.toBeInTheDocument();
    await completarFicha();
    await userEvent.click(screen.getByRole('button', { name: /Guardar perfil/ }));

    expect(await screen.findByText('Tu ficha profesional se guardó correctamente.')).toBeInTheDocument();
    expect(cuerpoPut(fetch)).toEqual(NUEVA);
    expect(screen.getByRole('heading', { level: 1, name: 'Matías Rojas' })).toBeInTheDocument();
    expect(screen.getByText('Atención nutricional')).toBeInTheDocument();
  });

  test('sin completar los campos obligatorios no guarda y señala cada uno', async () => {
    const fetch = simularServidor();
    renderizarApp('/profesional/perfil');

    await userEvent.click(await screen.findByRole('button', { name: /Guardar perfil/ }));

    // Los mensajes de error se anuncian como alertas (el de la especialidad también es la opción inicial del selector).
    expect(screen.getAllByRole('alert').map((alerta) => alerta.textContent)).toEqual(expect.arrayContaining([
      'Selecciona tu especialidad', 'Selecciona cómo atiendes', 'Ingresa la comuna donde atiendes',
      'La latitud debe estar entre -90 y 90', 'La longitud debe estar entre -180 y 180',
    ]));
    expect(huboPut(fetch)).toBe(false);
  });

  test('los errores de la API se muestran en su campo', async () => {
    simularServidor({ alGuardar: () => respuestaJson(400, { error: 'Revisa los datos ingresados', detalles: { comuna: 'La comuna admite hasta 80 caracteres' } }) });
    renderizarApp('/profesional/perfil');

    await screen.findByRole('heading', { name: 'Configura tu perfil profesional' });
    await completarFicha();
    await userEvent.click(screen.getByRole('button', { name: /Guardar perfil/ }));

    expect(await screen.findByText('La comuna admite hasta 80 caracteres')).toBeInTheDocument();
    expect(screen.getByText('Revisa los datos ingresados')).toBeInTheDocument();
  });
});

describe('Con ficha', () => {
  test('muestra su ficha pública: especialidad, calificación, verificación, comuna y "Sobre mí"', async () => {
    simularServidor({ ficha: MI_FICHA });
    renderizarApp('/profesional/perfil');

    expect(await screen.findByRole('heading', { level: 1, name: 'Matías Rojas' })).toBeInTheDocument();
    const identidad = screen.getByRole('complementary', { name: 'Tu ficha' });
    expect(within(identidad).getAllByText('Entrenamiento personal').length).toBeGreaterThan(0);
    expect(within(identidad).getByText('Sin verificar')).toBeInTheDocument();
    expect(within(identidad).getByRole('img', { name: 'Calificación 4,8 de 5, 5 reseñas' })).toBeInTheDocument();
    expect(screen.getByText('Entrenamiento funcional y de fuerza.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Ver mi perfil público/ })).toHaveAttribute('href', '/profesional/perfil/publico');
  });

  test('las pestañas que aún no existen lo dicen sin simular datos', async () => {
    simularServidor({ ficha: MI_FICHA });
    renderizarApp('/profesional/perfil');

    await userEvent.click(await screen.findByRole('tab', { name: 'Horarios' }));
    expect(screen.getByRole('tab', { name: 'Horarios' })).toHaveAttribute('aria-selected', 'true');
    const panel = screen.getByRole('tabpanel');
    expect(within(panel).getByText('Próximamente')).toBeInTheDocument();
    expect(within(panel).getByText(/desde la Agenda/)).toBeInTheDocument();
  });

  test('"Editar perfil" abre el formulario con sus datos y "Cancelar" vuelve sin guardar', async () => {
    const fetch = simularServidor({ ficha: MI_FICHA });
    renderizarApp('/profesional/perfil');

    await userEvent.click(await screen.findByRole('button', { name: /Editar perfil/ }));
    expect(screen.getByRole('heading', { name: 'Editar perfil profesional' })).toBeInTheDocument();
    expect(screen.getByLabelText('Comuna (obligatorio)')).toHaveValue('Providencia');
    expect(screen.getByLabelText('Especialidad (obligatorio)')).toHaveValue('Entrenamiento personal');
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(screen.getByRole('heading', { level: 1, name: 'Matías Rojas' })).toBeInTheDocument();
    expect(huboPut(fetch)).toBe(false);
  });
});

// "Perfil profesional" (FS-HU-04): ficha propia con su formulario, pestañas y vista previa de la ficha pública.
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import {
  cuentaDePrueba, ESPECIALIDADES_DE_PRUEBA, fichaProfesional, MI_FICHA, renderizarApp, respuestaJson, SESION_PROFESIONAL,
} from '../../tests/utilidades.jsx';
// El mapa de la ficha (SC-28) se prueba en FormularioFicha.test.jsx: aquí queda cargando.
vi.mock('../../services/mapas.js', () => ({ cargarMapLibre: () => new Promise(() => {}), ESTILO_MAPA: 'https://estilo.prueba/style.json' }));

const NUEVA = {
  especialidad: 'Nutrición', descripcion: '', comuna: 'Ñuñoa', direccion: 'Av. Irarrázaval 2401', modalidad: 'ambas',
  ubicacionLat: -33.4569, ubicacionLng: -70.5976,
};
// Lo que entrega la búsqueda de la ubicación (SC-28): el profesional ya no escribe coordenadas.
const UBICACION = { lat: -33.4569, lng: -70.5976, precision: 'exacta', encontrada: 'Avenida Irarrázaval 2401, Ñuñoa' };
const RESUMEN_VACIO = { promedio: null, total: 0, distribucion: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } };

// Servidor simulado: el catálogo de especialidades (FS-HU-30), la ficha propia (null hasta que se guarda) y su ficha
// pública por id.
function simularServidor({ ficha = null, alGuardar } = {}) {
  const estado = { ficha };
  return vi.spyOn(globalThis, 'fetch').mockImplementation((url, opciones = {}) => {
    if (url === '/api/perfil/cuenta') return respuestaJson(200, { cuenta: cuentaDePrueba(SESION_PROFESIONAL.usuario) });
    if (url === '/api/especialidades') return respuestaJson(200, { especialidades: ESPECIALIDADES_DE_PRUEBA });
    if (url.startsWith('/api/profesionales/mi-ficha/ubicacion')) return respuestaJson(200, UBICACION);
    if (url === '/api/profesionales/mi-ficha' && opciones.method === 'PUT') {
      if (alGuardar) return alGuardar();
      estado.ficha = { id: 3, ...JSON.parse(opciones.body) };
      return respuestaJson(200, { ficha: estado.ficha });
    }
    if (url === '/api/profesionales/mi-ficha') return respuestaJson(200, { ficha: estado.ficha });
    if (url === '/api/profesionales/mi-ficha/experiencia') return respuestaJson(200, {
      experiencia: { aniosExperiencia: null, formacion: [], atiendeA: [], registroSis: null, precioDesde: null },
    });
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
const huboPutFicha = (fetch) => fetch.mock.calls.some(([url, opciones = {}]) => url === '/api/profesionales/mi-ficha' && opciones.method === 'PUT');
const abrirSeccion = async (nombre) => userEvent.click(
  within(await screen.findByRole('navigation', { name: 'Secciones del perfil' })).getByRole('button', { name: nombre }),
);
// Desde el 16-11-2026 la especialidad se elige en «Información personal» y la ficha se completa en «Lugar de atención».
const abrirLugar = () => abrirSeccion('Lugar de atención');
const guardarDatos = () => userEvent.click(screen.getByRole('button', { name: /Guardar datos personales/ }));
const guardarPerfil = () => userEvent.click(screen.getByRole('button', { name: /Guardar perfil/ }));

async function elegirEspecialidad(nombre = 'Nutrición') {
  // El catálogo de especialidades llega de la API (FS-HU-30).
  await screen.findByRole('option', { name: nombre });
  await userEvent.selectOptions(screen.getByLabelText('Especialidad (obligatorio)'), nombre);
  await guardarDatos();
}
async function completarLugar({ modalidad = 'ambas', direccion = 'Av. Irarrázaval 2401' } = {}) {
  await userEvent.selectOptions(await screen.findByLabelText('Modalidad de atención (obligatorio)'), modalidad);
  if (modalidad !== 'online') await userEvent.type(screen.getByLabelText('Comuna (obligatorio)'), 'Ñuñoa');
  if (direccion) await userEvent.type(screen.getByLabelText(/^Dirección de atención/), direccion);
}

beforeEach(() => sessionStorage.setItem('fitsearch_sesion', JSON.stringify(SESION_PROFESIONAL)));

describe('Sin ficha', () => {
  test('la especialidad se elige en «Información personal» y la ficha se crea al guardar el lugar de atención', async () => {
    const fetch = simularServidor();
    renderizarApp('/profesional/perfil');

    const nav = within(await screen.findByRole('navigation', { name: 'Secciones del perfil' }));
    expect(nav.getByRole('button', { name: 'Información personal' })).toHaveAttribute('aria-current', 'page');
    expect(await screen.findByText(/Elige aquí tu especialidad y completa tu «Lugar de atención»/)).toBeInTheDocument();
    expect(screen.queryByLabelText('Descripción sobre tu atención')).not.toBeInTheDocument();
    await elegirEspecialidad();
    expect(await screen.findByText('Elegiste Nutrición. Se guardará en tu ficha cuando completes «Lugar de atención».')).toBeInTheDocument();
    expect(huboPutFicha(fetch)).toBe(false);

    await abrirLugar();
    expect(screen.getByText(/Último paso/).closest('p')).toHaveTextContent('Especialidad: Nutrición');
    expect(within(screen.getByRole('form', { name: 'Lugar de atención' })).queryByRole('button', { name: 'Cancelar' })).not.toBeInTheDocument();
    await completarLugar();
    expect(screen.getByLabelText('Dirección de atención (obligatorio)')).toHaveAttribute('autocomplete', 'street-address');
    await guardarPerfil();

    expect(await screen.findByText('Tu ficha profesional se guardó correctamente.')).toBeInTheDocument();
    expect(cuerpoPut(fetch)).toEqual(NUEVA);
    expect(screen.getByRole('heading', { level: 1, name: 'Mi perfil profesional' })).toBeInTheDocument();
    // La ficha ya existe: la misma sección queda para editar.
    expect(await screen.findByRole('button', { name: /Guardar cambios/ })).toBeInTheDocument();
  });

  test('sin especialidad, el lugar de atención no se guarda y lleva a elegirla', async () => {
    const fetch = simularServidor();
    renderizarApp('/profesional/perfil');
    await abrirLugar();
    expect(await screen.findByText(/Primero elige tu especialidad/)).toBeInTheDocument();
    await guardarPerfil();
    expect(screen.getAllByRole('alert').map((alerta) => alerta.textContent)).toEqual(expect.arrayContaining([
      'Selecciona cómo atiendes', 'Ingresa la comuna donde atiendes', 'Ingresa la dirección donde atiendes',
    ]));
    await completarLugar();
    await guardarPerfil();
    expect(await screen.findByText('Antes de guardar, elige tu especialidad en «Información personal».')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Ir a «Información personal»' }));
    expect(await screen.findByLabelText('Especialidad (obligatorio)')).toBeInTheDocument();
    expect(huboPutFicha(fetch)).toBe(false);
  });

  test('si atiende solo online no se pide ni se guarda ubicación', async () => {
    const fetch = simularServidor();
    renderizarApp('/profesional/perfil');
    await elegirEspecialidad();
    await abrirLugar();
    await completarLugar({ modalidad: 'online', direccion: '' });
    expect(screen.queryByLabelText(/^Dirección de atención/)).not.toBeInTheDocument();
    await guardarPerfil();

    expect(await screen.findByText('Tu ficha profesional se guardó correctamente.')).toBeInTheDocument();
    expect(cuerpoPut(fetch)).toMatchObject({ especialidad: 'Nutrición', modalidad: 'online', comuna: null, direccion: null, ubicacionLat: null, ubicacionLng: null });
  });

  test('los errores de la API se muestran en su campo', async () => {
    simularServidor({ alGuardar: () => respuestaJson(400, { error: 'Revisa los datos ingresados', detalles: { comuna: 'La comuna admite hasta 80 caracteres' } }) });
    renderizarApp('/profesional/perfil');
    await elegirEspecialidad();
    await abrirLugar();
    await completarLugar();
    await guardarPerfil();

    expect(await screen.findByText('La comuna admite hasta 80 caracteres')).toBeInTheDocument();
    expect(screen.getByText('Revisa los datos ingresados')).toBeInTheDocument();
  });
});

describe('Perfil profesional editable', () => {
  test('conserva la verificación, calificación y el enlace público', async () => {
    simularServidor({ ficha: { ...MI_FICHA, verificado: true } });
    renderizarApp('/profesional/perfil');
    expect(await screen.findByText('Verificado')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Calificación 4,8 de 5, 5 reseñas' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Ver mi perfil público/ })).toHaveAttribute('href', '/profesional/perfil/publico');
    expect(screen.getByRole('link', { name: /Ir a mi agenda/ })).toHaveAttribute('href', '/profesional/agenda');
  });
  test('online no ofrece la ubicación antigua y conserva la modalidad', async () => {
    simularServidor({ ficha: { ...MI_FICHA, modalidad: 'online', comuna: null, direccion: null } });
    renderizarApp('/profesional/perfil');
    await abrirLugar();
    expect(await screen.findByLabelText('Modalidad de atención (obligatorio)')).toHaveValue('online');
    expect(screen.getAllByText('Atención online').length).toBeGreaterThan(0);
    expect(screen.queryByLabelText('Comuna (obligatorio)')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Google Maps/ })).not.toBeInTheDocument();
  });
  // Pedido del PO del 16-11-2026: la especialidad va en «Información personal», sin la descripción de la ficha.
  test('las secciones: la especialidad en Información personal y el lugar de atención aparte, sin descripción', async () => {
    simularServidor({ ficha: { ...MI_FICHA, direccion: 'Av. Italia 850' } });
    renderizarApp('/profesional/perfil');
    const nav = within(await screen.findByRole('navigation', { name: 'Secciones del perfil' }));
    expect(nav.getAllByRole('button').map((b) => b.textContent))
      .toEqual(['Información personal', 'Lugar de atención', 'Experiencia y formación', 'Certificaciones']);
    expect(nav.getByRole('button', { name: 'Información personal' })).toHaveAttribute('aria-current', 'page');
    // La sección actual lleva el ícono marcado, igual que el menú lateral (18-11-2026).
    expect(nav.getByRole('button', { name: 'Información personal' }).querySelector('.icono--activo')).not.toBeNull();
    expect(nav.getByRole('button', { name: 'Lugar de atención' }).querySelector('.icono--activo')).toBeNull();
    expect(await screen.findByLabelText(/^Tu presentación \(opcional\)/)).toBeInTheDocument();
    expect(await screen.findByLabelText('Especialidad (obligatorio)')).toHaveValue('Entrenamiento personal');
    expect(screen.queryByLabelText('Comuna (obligatorio)')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Descripción sobre tu atención')).not.toBeInTheDocument();

    await abrirLugar();
    expect(nav.getByRole('button', { name: 'Información personal' })).not.toHaveAttribute('aria-current');
    expect(await screen.findByLabelText('Dirección de atención (obligatorio)')).toHaveValue('Av. Italia 850');
    expect(screen.getByLabelText('Modalidad de atención (obligatorio)')).toBeInTheDocument();
    expect(screen.queryByLabelText('Especialidad (obligatorio)')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Descripción sobre tu atención')).not.toBeInTheDocument();

    await abrirSeccion('Experiencia y formación');
    expect(await screen.findByRole('button', { name: 'Agregar experiencia' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Horarios' })).not.toBeInTheDocument();
  });
  test('guardar la especialidad desde Información personal mantiene el lugar de atención guardado', async () => {
    const fetch = simularServidor({ ficha: { ...MI_FICHA, direccion: 'Av. Italia 850' } });
    renderizarApp('/profesional/perfil');
    await elegirEspecialidad('Nutrición');

    expect(await screen.findByText('Tu especialidad se guardó correctamente.')).toBeInTheDocument();
    expect(cuerpoPut(fetch)).toEqual({
      especialidad: 'Nutrición', descripcion: 'Entrenamiento funcional y de fuerza.', comuna: 'Providencia', direccion: 'Av. Italia 850',
      modalidad: 'ambas', ubicacionLat: -33.4263, ubicacionLng: -70.6116,
    });
  });
  test('los datos personales y la especialidad se guardan con el mismo botón', async () => {
    const fetch = simularServidor({ ficha: { ...MI_FICHA, direccion: 'Av. Italia 850' } });
    renderizarApp('/profesional/perfil');
    await userEvent.type(await screen.findByLabelText('Teléfono de contacto (opcional)'), '+56 9 1111 2222');
    await elegirEspecialidad('Kinesiología');
    expect(await screen.findByText('Tus datos personales se guardaron correctamente. Tu especialidad se guardó correctamente.')).toBeInTheDocument();
    expect(fetch.mock.calls.some(([url, o = {}]) => url === '/api/perfil/cuenta' && o.method === 'PUT')).toBe(true);
    expect(cuerpoPut(fetch)).toMatchObject({ especialidad: 'Kinesiología' });
  });
  test('con el perfil verificado, avisa que cambiar la especialidad quita la verificación', async () => {
    simularServidor({ ficha: { ...MI_FICHA, verificado: true } });
    renderizarApp('/profesional/perfil');
    await screen.findByRole('option', { name: 'Nutrición' });
    expect(screen.queryByText(/dejará de estar verificado/)).not.toBeInTheDocument();
    await userEvent.selectOptions(screen.getByLabelText('Especialidad (obligatorio)'), 'Nutrición');
    expect(screen.getByText(/Si cambias tu especialidad, tu perfil dejará de estar verificado/)).toBeInTheDocument();
    await userEvent.selectOptions(screen.getByLabelText('Especialidad (obligatorio)'), 'Entrenamiento personal');
    expect(screen.queryByText(/dejará de estar verificado/)).not.toBeInTheDocument();
  });
  test('si la ubicación guardada no es válida, no cambia la especialidad y lo explica', async () => {
    const fetch = simularServidor({ ficha: { ...MI_FICHA, direccion: 'Av. Italia 850', ubicacionLat: -90, ubicacionLng: -90 } });
    renderizarApp('/profesional/perfil');
    await elegirEspecialidad('Nutrición');
    expect(await screen.findByText(/Tu lugar de atención no tiene una ubicación válida en el mapa/)).toBeInTheDocument();
    expect(huboPutFicha(fetch)).toBe(false);
  });
  // FS-HU-30: las especialidades vienen del catálogo que administra el administrador.
  test('ofrece la especialidad que ya tenía la ficha aunque el administrador la haya desactivado', async () => {
    simularServidor({ ficha: { ...MI_FICHA, especialidad: 'Masoterapia' } });
    renderizarApp('/profesional/perfil');
    await screen.findByRole('option', { name: 'Nutrición' });
    const selector = screen.getByLabelText('Especialidad (obligatorio)');
    expect(selector).toHaveValue('Masoterapia');
    expect(within(selector).getAllByRole('option').map((opcion) => opcion.textContent)).toEqual([
      'Selecciona tu especialidad', 'Entrenamiento personal', 'Kinesiología', 'Medicina deportiva', 'Nutrición', 'Psicología deportiva', 'Masoterapia',
    ]);
  });
  test('las secciones se recorren con el teclado y se activan con Enter', async () => {
    simularServidor({ ficha: MI_FICHA }); renderizarApp('/profesional/perfil');
    const nav = within(await screen.findByRole('navigation', { name: 'Secciones del perfil' }));
    const boton = nav.getByRole('button', { name: 'Certificaciones' });
    boton.focus(); await userEvent.keyboard('{Enter}');
    expect(boton).toHaveFocus(); expect(boton).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('heading', { name: 'Certificaciones' })).toBeInTheDocument();
  });
  test('Cancelar descarta cambios de la ficha sin guardar', async () => {
    const fetch = simularServidor({ ficha: { ...MI_FICHA, direccion: 'Av. Italia 850' } });
    renderizarApp('/profesional/perfil');
    await abrirLugar();
    const comuna = await screen.findByLabelText('Comuna (obligatorio)');
    await userEvent.clear(comuna); await userEvent.type(comuna, 'Santiago');
    const form = within(comuna.closest('form'));
    await userEvent.click(form.getByRole('button', { name: 'Cancelar' }));
    expect(screen.getByLabelText('Comuna (obligatorio)')).toHaveValue('Providencia');
    expect(huboPutFicha(fetch)).toBe(false);
  });
  test('copia el enlace público y ofrece alternativa manual si falla el portapapeles', async () => {
    const u = userEvent.setup();
    const copiar = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue();
    simularServidor({ ficha: MI_FICHA }); renderizarApp('/profesional/perfil');
    await u.click(await screen.findByRole('button', { name: 'Copiar enlace' }));
    expect(copiar).toHaveBeenCalledWith(`${window.location.origin}/profesionales/${MI_FICHA.id}`);
    expect(await screen.findByText('Enlace de tu perfil copiado.')).toBeInTheDocument();
    copiar.mockRejectedValue(new Error('Sin permiso'));
    await u.click(screen.getByRole('button', { name: 'Enlace copiado' }));
    expect(await screen.findByRole('textbox', { name: /No pudimos copiarlo automáticamente/ })).toHaveValue(`${window.location.origin}/profesionales/${MI_FICHA.id}`);
  });
});

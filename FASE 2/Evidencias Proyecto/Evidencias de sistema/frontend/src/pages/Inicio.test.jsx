// Inicio del usuario con sesión según el mockup (FS-HU-21): datos reales de la API y estados vacíos.
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';
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
    '/api/comidas': { consumo: { calorias: 1420, proteinasG: 85, carbohidratosG: 150, grasasG: 45 } },
    '/api/agua': { fecha: '2026-11-04', totalMl: 500, metaMl: 2000, vasoMl: 250, registros: [{ id: 1, ml: 500, hora: '10:15' }] },
    ...extra,
  });
}

describe('Resumen de macronutrientes en el inicio', () => {
  test('muestra consumo real, metas y decimales en español sin consultas adicionales', async () => {
    simular({ extra: { '/api/comidas': { consumo: { calorias: 1420, proteinasG: 85.5, carbohidratosG: 150, grasasG: 45 }, objetivo: { calorias: 2200, proteinasG: 110, carbohidratosG: 250, grasasG: 70 } } } });
    renderizarApp('/inicio');
    const macros = await screen.findByRole('group', { name: 'Macros de hoy' });
    await waitFor(() => expect(within(macros).getByText('85,5')).toBeInTheDocument());
    expect(within(macros).getByRole('progressbar', { name: 'Proteínas de hoy' })).toHaveAttribute('aria-valuenow', '85.5');
    expect(within(macros).getByRole('progressbar', { name: 'Carbohidratos de hoy' })).toHaveAttribute('aria-valuemax', '250');
    expect(within(macros).getByRole('progressbar', { name: 'Grasas de hoy' })).toHaveAttribute('aria-valuetext', '45 g consumidos de 70 g de meta');
  });
  test('sin metas muestra los gramos consumidos, incluidos ceros reales, sin inventar objetivos', async () => {
    simular({ extra: { '/api/comidas': { consumo: { calorias: 0, proteinasG: 0, carbohidratosG: 0, grasasG: 0 }, objetivo: null } } });
    renderizarApp('/inicio');
    const macros = await screen.findByRole('group', { name: 'Macros de hoy' });
    await waitFor(() => expect(within(macros).getAllByText('0')).toHaveLength(3));
    expect(within(macros).queryByRole('progressbar')).not.toBeInTheDocument();
  });
  test('al superar la meta conserva los gramos reales y limita la barra a su tamaño', async () => {
    simular({ extra: { '/api/comidas': { consumo: { calorias: 1420, proteinasG: 180, carbohidratosG: 150, grasasG: 45 }, objetivo: { proteinasG: 100 } } } });
    renderizarApp('/inicio');
    const barra = await screen.findByRole('progressbar', { name: 'Proteínas de hoy' });
    expect(barra).toHaveAttribute('aria-valuenow', '100');
    expect(barra).toHaveAttribute('aria-valuetext', '180 g consumidos de 100 g de meta');
    expect(barra.firstChild).toHaveStyle({ transform: 'scaleX(1)' });
  });
  test('si falla Comidas no confunde datos desconocidos con cero consumido', async () => {
    simular({ extra: { '/api/comidas': () => [503, { error: 'Sin conexión' }] } });
    renderizarApp('/inicio');
    await screen.findByText(/No pudimos cargar las calorías/);
    const macros = screen.getByRole('group', { name: 'Macros de hoy' });
    expect(within(macros).getAllByText('—')).toHaveLength(3);
    expect(within(macros).queryByRole('progressbar')).not.toBeInTheDocument();
  });
});

describe('Inicio con datos', () => {
  test('muestra el hero, los accesos rápidos, el objetivo, la meta de calorías y los profesionales destacados de la API', async () => {
    const fetch = simular();
    renderizarApp('/inicio');

    expect(screen.getByRole('heading', { level: 1, name: /¿Cómo quieres cuidarte hoy\?/ })).toBeInTheDocument();
    const accesos = screen.getByRole('heading', { name: 'Tus accesos rápidos' }).closest('section');
    for (const [nombre, ruta] of [['Profesionales', '/profesionales'], ['Centros de salud', '/centros-salud'], ['Gimnasios', '/gimnasios'], ['Mis citas', '/citas'], ['Asistente IA', '/asistente'], ['Comidas', '/comidas']]) {
      expect(within(accesos).getByRole('link', { name: new RegExp(`^${nombre}`) })).toHaveAttribute('href', ruta);
    }
    // Farmacias salió del alcance (decisión del PO del 05-10-2026). Desde FS-HU-25, Centros de salud y Gimnasios
    // también están disponibles, así que ningún acceso dice «Próximamente».
    expect(within(accesos).queryByRole('link', { name: /Farmacias/ })).not.toBeInTheDocument();
    expect(within(accesos).getAllByRole('link')).toHaveLength(6);
    expect(within(accesos).queryByText('Próximamente')).not.toBeInTheDocument();

    expect(await screen.findByText('Bajar de peso')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Ver detalle de objetivos/ })).toHaveAttribute('href', '/perfil');
    const objetivo = screen.getByRole('heading', { name: /Tu objetivo actual/ }).closest('section');
    expect(within(objetivo).getByRole('link', { name: 'Comidas' })).toHaveAttribute('href', '/comidas');
    const progreso = screen.getByRole('heading', { name: 'Tu progreso' }).closest('section');
    // Calorías registradas hoy en Comidas frente a la meta estimada con el perfil.
    await waitFor(() => expect(progreso).toHaveTextContent('1.420 / 2.556 kcal'));
    expect(within(progreso).getByRole('link', { name: 'Registrar comida' })).toHaveAttribute('href', '/comidas');
    // «Pasos hoy» se quitó (SC-33) y «Agua hoy» muestra el agua registrada hoy frente a la meta (FS-HU-33).
    expect(within(progreso).queryByText('Pasos hoy')).not.toBeInTheDocument();
    await waitFor(() => expect(progreso).toHaveTextContent('500 / 2.000 ml'));
    expect(within(progreso).getByRole('button', { name: 'Sumar 1 vaso de 250 ml' })).toBeInTheDocument();
    expect(within(progreso).queryByText('Próximamente')).not.toBeInTheDocument();

    expect(await screen.findByRole('heading', { name: 'Matías Demo' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Calificación 4,8 de 5, 4 reseñas' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Ver todos/ })).toHaveAttribute('href', '/profesionales');
    expect(parametrosDe(llamadasA(fetch, '/api/profesionales?')[0][0])).toEqual({ orden: 'destacados', limite: '4' });
  });


  // En celular (bajo 40rem) estas tres listas se deslizan como carrusel; el CSS decide el ancho (11-11-2026).
  test('los accesos rápidos, las especialidades y los destacados son carruseles en celular, sin perder ningún enlace', async () => {
    simular();
    renderizarApp('/inicio');
    const destacadosSeccion = (await screen.findByRole('heading', { name: 'Profesionales destacados' })).closest('section');
    await within(destacadosSeccion).findByText('Matías Demo');
    const accesos = screen.getByRole('heading', { name: 'Tus accesos rápidos' }).closest('section').querySelector('ul');
    const especialidades = screen.getByRole('heading', { name: 'Encuentra a tu profesional' }).closest('section').querySelector('.especialidades');
    const destacados = destacadosSeccion.querySelector('.inicio__lista-destacados');
    for (const lista of [accesos, especialidades, destacados]) expect(lista).toHaveClass('carrusel-movil');
    expect(within(accesos).getAllByRole('link')).toHaveLength(6);
    expect(within(especialidades).getAllByRole('link')).toHaveLength(3);
  });

  // Flechas de los carruseles (11-11-2026): cada una aparece solo si hay más tarjetas hacia su lado y mueve la fila.
  test('las flechas del carrusel aparecen cuando hay más tarjetas y desplazan la fila hacia cada lado', async () => {
    simular();
    renderizarApp('/inicio');
    const seccion = screen.getByRole('heading', { name: 'Encuentra a tu profesional' }).closest('section');
    const fila = seccion.querySelector('.especialidades');
    const atras = within(seccion).getByRole('button', { name: 'Ver especialidades anteriores' });
    const adelante = within(seccion).getByRole('button', { name: 'Ver más especialidades' });
    // jsdom no calcula tamaños: sin contenido oculto, ninguna flecha está disponible (como en escritorio).
    expect(atras).toBeDisabled();
    expect(adelante).toBeDisabled();

    Object.defineProperties(fila, { clientWidth: { value: 300, configurable: true }, scrollWidth: { value: 900, configurable: true } });
    fila.scrollBy = vi.fn();
    fireEvent.scroll(fila);
    await waitFor(() => expect(adelante).toBeEnabled());
    expect(atras).toBeDisabled();
    await userEvent.click(adelante);
    expect(fila.scrollBy).toHaveBeenCalledWith({ left: 240, behavior: 'smooth' });

    // Al final de la fila se apaga la flecha de avanzar y queda la de volver.
    fila.scrollLeft = 600;
    fireEvent.scroll(fila);
    await waitFor(() => expect(adelante).toBeDisabled());
    expect(atras).toBeEnabled();
    await userEvent.click(atras);
    expect(fila.scrollBy).toHaveBeenLastCalledWith({ left: -240, behavior: 'smooth' });
  });

  test('la tarjeta de especialidad abre el directorio con el filtro elegido', async () => {
    const fetch = simular({ extra: {
      '/api/profesionales/filtros': { especialidades: ['Kinesiología'], comunas: [] },
    } });
    renderizarApp('/inicio');
    await userEvent.click(screen.getByRole('link', { name: 'Explorar Kinesiología' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Profesionales' })).toBeInTheDocument();
    await waitFor(() => expect(llamadasA(fetch, '/api/profesionales?').some(([url]) => parametrosDe(url).especialidad === 'Kinesiología')).toBe(true));
  });

  test('las próximas citas consultan la agenda y muestran su estado vacío con acción', async () => {
    simular(); renderizarApp('/inicio');
    const citas = screen.getByRole('heading', { name: 'Próximas citas' }).closest('section');
    expect(await within(citas).findByText('Aún no tienes citas agendadas')).toBeInTheDocument();
    expect(within(citas).getByRole('link', { name: 'Buscar profesionales' })).toHaveAttribute('href', '/profesionales');
    expect(within(citas).getByRole('link', { name: 'Ver todas' })).toHaveAttribute('href', '/citas');
  });

  // Buscador general (SC-23): recorre la aplicación; buscar en profesionales queda como última sugerencia.
  const buscador = () => screen.getByRole('combobox', { name: '¿Qué necesitas hoy?' });
  const menuLateral = () => screen.getByRole('navigation', { name: 'Menú principal' });

  test('sin coincidencias, Enter busca el texto en profesionales como antes', async () => {
    const fetch = simular(); renderizarApp('/inicio');
    await userEvent.type(buscador(), 'dolor de rodilla');
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual(['Buscar «dolor de rodilla» en profesionalesProfesionales']);
    await userEvent.keyboard('{Enter}');

    expect(await screen.findByRole('heading', { level: 1, name: 'Profesionales' })).toBeInTheDocument();
    expect(screen.getByRole('searchbox', { name: 'Buscar profesionales' })).toHaveValue('dolor de rodilla');
    await waitFor(() => expect(llamadasA(fetch, '/api/profesionales?q=').length).toBeGreaterThan(0));
  });

  test('escribir "perfil" y presionar Enter lleva a Mi perfil (la primera sugerencia)', async () => {
    simular(); renderizarApp('/inicio');
    await userEvent.type(buscador(), 'perfil');
    expect(buscador()).toHaveAttribute('aria-expanded', 'true');
    const primera = screen.getAllByRole('option')[0];
    expect(primera).toHaveTextContent('Mi perfil');
    expect(primera).toHaveAttribute('aria-selected', 'true');
    expect(buscador()).toHaveAttribute('aria-activedescendant', primera.id);
    await userEvent.keyboard('{Enter}');
    await waitFor(() => expect(within(menuLateral()).getByRole('link', { name: 'Mi perfil' })).toHaveAttribute('aria-current', 'page'));
  });

  test('"chat ia" ofrece el Asistente IA y al elegirlo con el mouse lleva a su página', async () => {
    simular(); renderizarApp('/inicio');
    await userEvent.type(buscador(), 'chat ia');
    const asistente = screen.getByRole('option', { name: /Asistente IA/ });
    expect(within(asistente).queryByText('Próximamente')).not.toBeInTheDocument();
    await userEvent.click(asistente);
    expect(await screen.findByRole('heading', { level: 1, name: 'Asistente IA' })).toBeInTheDocument();
  });

  test('las flechas cambian la sugerencia marcada y Escape cierra la lista', async () => {
    simular(); renderizarApp('/inicio');
    await userEvent.type(buscador(), 'salud');
    expect(screen.getAllByRole('option').map((o) => o.getAttribute('aria-selected'))).toEqual(['true', 'false', 'false']);
    await userEvent.keyboard('{ArrowDown}');
    const segunda = screen.getAllByRole('option')[1];
    expect(segunda).toHaveTextContent('Centros de salud');
    expect(segunda).toHaveAttribute('aria-selected', 'true');
    expect(buscador()).toHaveAttribute('aria-activedescendant', segunda.id);
    await userEvent.keyboard('{ArrowUp}{ArrowUp}');
    expect(screen.getAllByRole('option').at(-1)).toHaveAttribute('aria-selected', 'true');
    await userEvent.keyboard('{Escape}');
    expect(buscador()).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('option')).not.toBeInTheDocument();
    expect(buscador()).toHaveValue('salud');
  });

  test('una especialidad del directorio lleva al buscador de profesionales con ese filtro', async () => {
    const fetch = simular({ extra: { '/api/profesionales/filtros': { especialidades: ['Kinesiología', 'Nutrición'], comunas: [] } } });
    renderizarApp('/inicio');
    await userEvent.type(buscador(), 'nutri');
    const especialidad = await screen.findByRole('option', { name: /Ver profesionales de Nutrición/ });
    // El catálogo se pide una sola vez, al empezar a usar el buscador (no al cargar el Inicio).
    expect(llamadasA(fetch, '/api/profesionales/filtros')).toHaveLength(1);
    await userEvent.click(especialidad);
    expect(await screen.findByRole('heading', { level: 1, name: 'Profesionales' })).toBeInTheDocument();
    await waitFor(() => expect(parametrosDe(llamadasA(fetch, '/api/profesionales?').at(-1)[0])).toMatchObject({ especialidad: 'Nutrición' }));
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

  test('el saludo va dentro del banner de la foto, con el nombre en mayúscula inicial y sin el titular anterior', () => {
    sessionStorage.setItem('fitsearch_sesion', JSON.stringify({ ...SESION, usuario: { ...SESION.usuario, nombre: 'nicolas silva' } }));
    simular();
    renderizarApp('/inicio');

    const titulo = screen.getByRole('heading', { level: 1, name: 'Hola, Nicolas. ¿Cómo quieres cuidarte hoy?' });
    const banner = titulo.closest('section');
    expect(banner).toHaveClass('inicio__hero');
    expect(banner).toHaveAccessibleName('Hola, Nicolas. ¿Cómo quieres cuidarte hoy?');
    expect(within(banner).getByText('Encuentra profesionales de la salud y el deporte, y da el siguiente paso hacia tu bienestar.')).toBeInTheDocument();
    expect(within(banner).getByRole('search')).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.queryByText(/Tu próximo paso/)).not.toBeInTheDocument();
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

  test('con el tipo de cuenta pendiente lleva a "Elegir perfil" (sesiones guardadas antes del cambio)', async () => {
    simular({ perfil: respuestaPerfil({ tipoCuenta: false }) });
    renderizarApp('/inicio');
    expect(await screen.findByRole('heading', { name: '¿Cómo quieres usar FitSearch?' })).toBeInTheDocument();
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
    expect(screen.getByRole('heading', { name: 'Inicia sesión' })).toBeInTheDocument();
  });
});

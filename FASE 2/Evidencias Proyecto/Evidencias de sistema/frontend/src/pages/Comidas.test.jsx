// Gestor de alimentación (FS-HU-09 y FS-HU-10; mockup del PO del 26-10-2026).
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import reglas from '@shared/reglas.json';
import { llamadasA, renderizarApp, SESION, simularApi } from '../tests/utilidades.jsx';

const HOY = '2026-10-26';
const OBJETIVO = {
  calorias: 2525, proteinasG: 189, carbohidratosG: 284, grasasG: 70, plan: { tipo: 'personalizado', porcentajes: { proteinas: 30, carbohidratos: 45, grasas: 25 } },
  perfil: { objetivoPrincipal: 'Mantener peso', pesoKg: 68, alturaCm: 175, actividadFisica: 'Moderada' },
};
const registro = (extra) => ({ fecha: HOY, alimentoId: 1, origen: 'manual', ...extra });
const REGISTROS = [
  registro({ id: 1, momento: 'desayuno', nombre: 'Avena en hojuelas', gramos: 80, calorias: 311, proteinasG: 13.5, carbohidratosG: 53, grasasG: 5.5, hora: '08:12' }),
  registro({ id: 2, momento: 'almuerzo', nombre: 'Pechuga de pollo cocida', gramos: 150, calorias: 248, proteinasG: 46.5, carbohidratosG: 0, grasasG: 5.4, hora: '13:05' }),
  registro({ id: 3, momento: 'almuerzo', nombre: 'Arroz blanco cocido', gramos: 150, calorias: 195, proteinasG: 4.1, carbohidratosG: 42.3, grasasG: 0.5, hora: '13:06', origen: 'asistente' }),
];
const sumar = (lista) => lista.reduce((t, r) => ({
  calorias: t.calorias + r.calorias, proteinasG: t.proteinasG + r.proteinasG, carbohidratosG: t.carbohidratosG + r.carbohidratosG, grasasG: t.grasasG + r.grasasG,
}), { calorias: 0, proteinasG: 0, carbohidratosG: 0, grasasG: 0 });

function dia({ fecha = HOY, registros = REGISTROS, objetivo = OBJETIVO } = {}) {
  return {
    fecha, hoy: HOY, objetivo, consumo: sumar(registros),
    momentos: reglas.comidas.momentos.map(({ valor, etiqueta }) => {
      const propios = registros.filter((r) => r.momento === valor);
      return { momento: valor, etiqueta, hora: propios[0]?.hora ?? null, registros: propios, totales: sumar(propios) };
    }),
  };
}
const semana = (fecha = HOY) => ({
  desde: '2026-10-26', hasta: '2026-11-01', objetivoCalorias: 2525,
  dias: Array.from({ length: 7 }, (_, i) => ({ fecha: `2026-${i < 6 ? '10' : '11'}-${String(i < 6 ? 26 + i : 1).padStart(2, '0')}`, calorias: i === 0 && fecha === HOY ? 754 : 0, futuro: i > 0 })),
});
const fechaDe = (url) => new URL(url, 'http://localhost').searchParams.get('fecha') ?? HOY;
const ARROZ = { id: 17, nombre: 'Arroz blanco cocido', calorias: 130, proteinasG: 2.7, carbohidratosG: 28.2, grasasG: 0.3 };

function simular(extra = {}) {
  return simularApi({
    '/api/comidas/semana': (url) => [200, semana(fechaDe(url))],
    '/api/comidas/alimentos': { alimentos: [ARROZ] },
    '/api/comidas/': (url, { method }) => (method === 'DELETE' ? [204] : [200, { registro: REGISTROS[1] }]),
    '/api/comidas': (url, { method }) => (method === 'POST'
      ? [201, { registro: registro({ id: 9, momento: 'almuerzo', nombre: 'Arroz blanco cocido', gramos: 150, calorias: 195, proteinasG: 4.1, carbohidratosG: 42.3, grasasG: 0.5, hora: '13:30' }) }]
      : [200, dia({ fecha: fechaDe(url) })]),
    ...extra,
  });
}
const cuerpo = (llamada) => JSON.parse(llamada[1].body);

beforeEach(() => sessionStorage.setItem('fitsearch_sesion', JSON.stringify(SESION)));

describe('Resumen', () => {
  test('muestra las calorías y macros del día frente al objetivo, la semana, las comidas del día y el objetivo', async () => {
    simular();
    renderizarApp('/comidas');

    expect(screen.getByRole('heading', { level: 1, name: 'Comidas' })).toBeInTheDocument();
    const calorias = (await screen.findByRole('heading', { name: 'Calorías de hoy' })).closest('section');
    expect(calorias).toHaveTextContent('754kcalde 2.525 kcal');
    expect(calorias).toHaveTextContent('Proteínas64,1 g / 189 g34 %');
    expect(calorias).toHaveTextContent('Grasas11,4 g / 70 g16 %');

    const semanal = screen.getByRole('table', { name: /Calorías consumidas cada día de la semana; objetivo diario: 2525 kcal/ });
    expect(within(semanal).getByRole('row', { name: 'Lun 26/10 754 kcal' })).toBeInTheDocument();
    expect(within(semanal).getByRole('row', { name: 'Mar 27/10 Aún no llega' })).toBeInTheDocument();

    const comidas = screen.getByRole('heading', { name: 'Comidas de hoy' }).closest('section');
    expect(comidas).toHaveTextContent('Desayuno08:12Avena en hojuelas311 kcal');
    expect(comidas).toHaveTextContent('Almuerzo13:05Pechuga de pollo cocida, Arroz blanco cocido443 kcal');
    expect(within(comidas).getAllByText('Sin registros')).toHaveLength(3);

    const nutricional = screen.getByRole('heading', { name: 'Resumen nutricional' }).closest('section');
    expect(within(nutricional).getByRole('progressbar', { name: 'Calorías' })).toHaveAttribute('aria-valuetext', '30 % del objetivo');

    const objetivo = screen.getByRole('heading', { name: 'Tu objetivo' }).closest('section');
    expect(objetivo).toHaveTextContent('Mantener peso');
    expect(objetivo).toHaveTextContent('Peso68 kg');
    expect(objetivo).toHaveTextContent('Altura1,75 m');
    expect(objetivo).toHaveTextContent('ActividadModerada');
    expect(within(objetivo).getByRole('link', { name: 'Editar' })).toHaveAttribute('href', '/perfil');
    expect(screen.getByRole('link', { name: /Abrir asistente/ })).toHaveAttribute('href', '/asistente/nuevo?inicio=comida');

    // Las cuatro secciones están disponibles; la nota dice el reparto del plan y lleva a su pestaña (11-11-2026).
    const pestanas = screen.getByRole('group', { name: 'Secciones de Comidas' });
    expect(within(pestanas).getAllByRole('button').map((boton) => boton.textContent)).toEqual(['Resumen', 'Comidas', 'Plan de alimentación', 'Estadísticas']);
    expect(within(pestanas).queryByText('Próximamente')).not.toBeInTheDocument();
    expect(screen.getByText(/repartido según tu plan de alimentación: 30 % proteínas, 45 % carbohidratos y 25 % grasas/)).toBeInTheDocument();
  });

  test('sin perfil completo muestra el consumo sin objetivo e invita a completar el perfil', async () => {
    simular({ '/api/comidas': dia({ objetivo: { calorias: null, proteinasG: null, carbohidratosG: null, grasasG: null, perfil: { objetivoPrincipal: null, pesoKg: null, alturaCm: null, actividadFisica: null } } }) });
    renderizarApp('/comidas');
    const calorias = (await screen.findByRole('heading', { name: 'Calorías de hoy' })).closest('section');
    expect(calorias).toHaveTextContent('sin objetivo');
    expect(within(calorias).getByRole('link', { name: 'Ir a mi perfil' })).toHaveAttribute('href', '/perfil');
    expect(screen.getByText(/Completa tu peso, altura, edad, sexo y actividad física/)).toBeInTheDocument();
  });

  test('si la API falla muestra el error y permite reintentar', async () => {
    simular({ '/api/comidas': () => [500, { error: 'No pudimos cargar tus comidas' }] });
    renderizarApp('/comidas');
    expect(await screen.findByText('No pudimos cargar tus comidas')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument();
  });

  // En celular las pestañas no caben (11-11-2026): la fila se desliza, tiene flechas y muestra entera la pestaña tocada.
  test('las pestañas se deslizan con flechas y la que se ve a medias se muestra entera al tocarla', async () => {
    simular();
    renderizarApp('/comidas');
    const pestanas = await screen.findByRole('group', { name: 'Secciones de Comidas' });
    const adelante = screen.getByRole('button', { name: 'Ver más secciones' });
    expect(adelante).toBeDisabled();
    Object.defineProperties(pestanas, { clientWidth: { value: 340, configurable: true }, scrollWidth: { value: 520, configurable: true } });
    pestanas.scrollBy = vi.fn();
    fireEvent.scroll(pestanas);
    await waitFor(() => expect(adelante).toBeEnabled());
    expect(screen.getByRole('button', { name: 'Ver secciones anteriores' })).toBeDisabled();

    // «Comidas» queda cortada por el borde derecho: al tocarla, la fila se corre lo justo para mostrarla entera.
    const comidas = within(pestanas).getByRole('button', { name: 'Comidas' });
    pestanas.getBoundingClientRect = () => ({ left: 16, right: 356 });
    comidas.getBoundingClientRect = () => ({ left: 330, right: 450 });
    await userEvent.click(comidas);
    expect(pestanas.scrollBy).toHaveBeenCalledWith({ left: 102, behavior: 'smooth' });
    expect(comidas).toHaveAttribute('aria-pressed', 'true');
  });
});

describe('Registrar comida', () => {
  test('busca el alimento, calcula el aporte de los gramos y lo agrega al momento elegido', async () => {
    const usuario = userEvent.setup();
    const fetch = simular();
    renderizarApp('/comidas');
    await screen.findByRole('heading', { name: 'Calorías de hoy' });

    await usuario.click(screen.getByRole('button', { name: /Registrar comida/ }));
    const panel = screen.getByRole('region', { name: 'Registrar comida' });
    await usuario.click(within(panel).getByRole('button', { name: 'Agregar a mis comidas' }));
    expect(within(panel).getByText('Busca y elige un alimento del catálogo.')).toBeInTheDocument();

    await usuario.selectOptions(within(panel).getByLabelText('Momento del día'), 'almuerzo');
    await usuario.type(within(panel).getByLabelText('Alimento'), 'arroz');
    await usuario.click(await within(panel).findByRole('button', { name: /^Arroz blanco cocido.*130 kcal por 100 g$/ }));
    expect(llamadasA(fetch, '/api/comidas/alimentos?q=arroz')).toHaveLength(1);
    const gramos = within(panel).getByLabelText('Gramos');
    await usuario.clear(gramos);
    await usuario.type(gramos, '0');
    await usuario.click(within(panel).getByRole('button', { name: 'Agregar a mis comidas' }));
    expect(within(panel).getByText('Indica entre 1 y 2.000 gramos.')).toBeInTheDocument();
    await usuario.clear(gramos);
    await usuario.type(gramos, '150');
    expect(panel).toHaveTextContent('150 g aportan 195 kcal · 4,1 g de proteínas · 42,3 g de carbohidratos · 0,5 g de grasas');

    await usuario.click(within(panel).getByRole('button', { name: 'Agregar a mis comidas' }));
    expect(await within(panel).findByText('Agregaste 150 g de arroz blanco cocido a tu almuerzo.')).toBeInTheDocument();
    const envio = llamadasA(fetch, '/api/comidas').find(([, opciones]) => opciones?.method === 'POST');
    expect(cuerpo(envio)).toEqual({ fecha: HOY, momento: 'almuerzo', alimentoId: 17, gramos: 150 });
    // El resumen se vuelve a pedir para mostrar el alimento nuevo.
    await waitFor(() => expect(llamadasA(fetch, '/api/comidas/semana').length).toBeGreaterThanOrEqual(2));
    await usuario.click(within(panel).getByRole('button', { name: 'Cerrar registro de comida' }));
    expect(screen.queryByRole('region', { name: 'Registrar comida' })).not.toBeInTheDocument();
  });

  test('«Registrar» en un momento vacío abre el panel con ese momento elegido', async () => {
    const usuario = userEvent.setup();
    simular();
    renderizarApp('/comidas');
    await usuario.click(await screen.findByRole('button', { name: 'Registrar cena' }));
    expect(within(screen.getByRole('region', { name: 'Registrar comida' })).getByLabelText('Momento del día')).toHaveValue('cena');
  });
});

describe('Pestaña Comidas', () => {
  test('lista cada alimento por momento y permite cambiar sus gramos o quitarlo', async () => {
    const usuario = userEvent.setup();
    const fetch = simular();
    renderizarApp('/comidas');
    await screen.findByRole('heading', { name: 'Calorías de hoy' });
    await usuario.click(screen.getByRole('button', { name: 'Comidas', pressed: false }));

    const almuerzo = screen.getByRole('heading', { name: /^Almuerzo/ }).closest('section');
    expect(almuerzo).toHaveTextContent('443 kcal');
    expect(within(almuerzo).getByText('Asistente')).toBeInTheDocument();
    await usuario.click(within(almuerzo).getByRole('button', { name: 'Editar Pechuga de pollo cocida' }));
    const gramos = within(almuerzo).getByLabelText('Gramos de Pechuga de pollo cocida');
    await usuario.clear(gramos);
    await usuario.type(gramos, '200');
    await usuario.selectOptions(within(almuerzo).getByLabelText('Momento del día de Pechuga de pollo cocida'), 'cena');
    await usuario.click(within(almuerzo).getByRole('button', { name: 'Guardar' }));
    await waitFor(() => expect(llamadasA(fetch, '/api/comidas/2').length).toBe(1));
    expect(llamadasA(fetch, '/api/comidas/2')[0][1].method).toBe('PATCH');
    expect(cuerpo(llamadasA(fetch, '/api/comidas/2')[0])).toEqual({ gramos: 200, momento: 'cena' });

    await usuario.click(within(almuerzo).getByRole('button', { name: 'Quitar Arroz blanco cocido' }));
    await waitFor(() => expect(llamadasA(fetch, '/api/comidas/3')[0][1].method).toBe('DELETE'));

    const cena = screen.getByRole('heading', { name: /^Cena/ }).closest('section');
    expect(within(cena).getByText('Aún no registras alimentos en este momento.')).toBeInTheDocument();
    await usuario.click(within(cena).getByRole('button', { name: /Agregar/ }));
    expect(within(screen.getByRole('region', { name: 'Registrar comida' })).getByLabelText('Momento del día')).toHaveValue('cena');
  });
});

test('se puede revisar un día anterior y volver a hoy; no se avanza más allá de hoy', async () => {
  const usuario = userEvent.setup();
  const fetch = simular();
  renderizarApp('/comidas');
  await screen.findByRole('heading', { name: 'Calorías de hoy' });
  expect(screen.getByRole('button', { name: 'Día siguiente' })).toBeDisabled();

  await usuario.click(screen.getByRole('button', { name: 'Día anterior' }));
  expect(await screen.findByRole('heading', { name: 'Calorías del día' })).toBeInTheDocument();
  expect(llamadasA(fetch, '/api/comidas?fecha=2026-10-25')).toHaveLength(1);
  expect(llamadasA(fetch, '/api/comidas/semana?fecha=2026-10-25')).toHaveLength(1);
  await usuario.click(screen.getByRole('button', { name: 'Volver a hoy' }));
  expect(await screen.findByRole('heading', { name: 'Calorías de hoy' })).toBeInTheDocument();
});

describe('Estadísticas (FS-HU-26)', () => {
  const diaEstadistica = (fecha, valores = null, futuro = false) => ({
    fecha, calorias: valores?.[0] ?? 0, proteinasG: valores?.[1] ?? 0, carbohidratosG: valores?.[2] ?? 0, grasasG: valores?.[3] ?? 0,
    conRegistros: Boolean(valores), futuro,
  });
  const SEMANA = {
    periodo: 'semana', desde: '2026-10-19', hasta: '2026-10-25', hoy: HOY,
    objetivo: { calorias: 2525, proteinasG: 189, carbohidratosG: 284, grasasG: 70 },
    dias: [
      diaEstadistica('2026-10-19', [2000, 120.5, 250, 60.3]), diaEstadistica('2026-10-20'), diaEstadistica('2026-10-21', [1500, 80, 190.4, 50]),
      ...['22', '23', '24', '25'].map((d) => diaEstadistica(`2026-10-${d}`)),
    ],
    diasConRegistros: 2,
    promedio: { calorias: 1750, proteinasG: 100.3, carbohidratosG: 220.2, grasasG: 55.2 },
  };
  const VACIA = {
    ...SEMANA, desde: '2026-10-26', hasta: '2026-11-01', diasConRegistros: 0, promedio: null,
    dias: Array.from({ length: 7 }, (_, i) => diaEstadistica(i < 6 ? `2026-10-${26 + i}` : '2026-11-01', null, i > 0)),
  };
  const MES = {
    ...SEMANA, periodo: 'mes', desde: '2026-10-01', hasta: '2026-10-31', diasConRegistros: 1,
    dias: Array.from({ length: 31 }, (_, i) => diaEstadistica(`2026-10-${String(i + 1).padStart(2, '0')}`, i === 18 ? [2000, 120.5, 250, 60.3] : null, i > 25)),
    promedio: { calorias: 2000, proteinasG: 120.5, carbohidratosG: 250, grasasG: 60.3 },
  };
  const parametro = (url, nombre) => new URL(url, 'http://localhost').searchParams.get(nombre);
  const responder = (url) => {
    if (parametro(url, 'periodo') === 'mes') return [200, MES];
    return [200, parametro(url, 'fecha') === '2026-10-25' ? SEMANA : VACIA];
  };

  test('muestra las calorías y macronutrientes de cada día frente al objetivo y el promedio de los días con registros', async () => {
    const usuario = userEvent.setup();
    const fetch = simular({ '/api/comidas/estadisticas': responder });
    renderizarApp('/comidas');
    await usuario.click(await screen.findByRole('button', { name: 'Estadísticas' }));
    // Parte de la semana del día elegido; sin registros, invita a registrar comidas.
    expect(await screen.findByRole('heading', { name: 'Aún no hay comidas registradas esta semana' })).toBeInTheDocument();
    expect(parametro(llamadasA(fetch, '/api/comidas/estadisticas')[0][0], 'fecha')).toBe(HOY);
    expect(screen.queryByRole('navigation', { name: 'Día' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Semana siguiente' })).toBeDisabled();

    await usuario.click(screen.getByRole('button', { name: 'Semana anterior' }));
    expect(await screen.findByText('Semana del 19 de octubre al 25 de octubre')).toBeInTheDocument();
    const calorias = screen.getByRole('table', { name: 'Calorías consumidas cada día de la semana; objetivo diario: 2.525 kcal' });
    expect(within(calorias).getByRole('row', { name: 'Lun 19/10 2.000 kcal' })).toBeInTheDocument();
    expect(within(calorias).getByRole('row', { name: 'Mar 20/10 Sin registros' })).toBeInTheDocument();
    const macros = screen.getByRole('table', { name: /Proteínas consumidas cada día de la semana, en gramos; objetivo diario: 189 g/ });
    expect(within(macros).getByRole('row', { name: 'Lun 19/10 120,5 g' })).toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: 'Grasas' }));
    expect(screen.getByRole('table', { name: /Grasas consumidas cada día de la semana, en gramos; objetivo diario: 70 g/ })).toBeInTheDocument();

    const promedio = screen.getByRole('heading', { name: 'Promedio diario' }).closest('section');
    expect(promedio).toHaveTextContent('Calculado con 2 días con registros de 7 días transcurridos.');
    expect(within(promedio).getByRole('progressbar', { name: 'Calorías' })).toHaveAttribute('aria-valuetext', '69 % del objetivo');
    expect(promedio).toHaveTextContent('Proteínas100,3 / 189 g');
    expect(screen.getByRole('button', { name: 'Semana siguiente' })).toBeEnabled();
  });

  test('el mes va del 1 al 31, cuenta solo los días transcurridos y no avanza más allá del mes actual', async () => {
    const usuario = userEvent.setup();
    const fetch = simular({ '/api/comidas/estadisticas': responder });
    renderizarApp('/comidas');
    await usuario.click(await screen.findByRole('button', { name: 'Estadísticas' }));
    await usuario.click(await screen.findByRole('button', { name: 'Mes' }));
    expect(await screen.findByText('Octubre de 2026')).toBeInTheDocument();
    expect(parametro(llamadasA(fetch, '/api/comidas/estadisticas').at(-1)[0], 'periodo')).toBe('mes');
    const calorias = screen.getByRole('table', { name: 'Calorías consumidas cada día del mes; objetivo diario: 2.525 kcal' });
    expect(within(calorias).getAllByRole('row')).toHaveLength(31);
    expect(within(calorias).getByRole('row', { name: 'Mar 27/10 Aún no llega' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Promedio diario' }).closest('section')).toHaveTextContent('Calculado con 1 día con registros de 26 días transcurridos.');
    expect(screen.getByRole('button', { name: 'Mes siguiente' })).toBeDisabled();
  });

  test('sin registros, «Registrar comida» abre el panel de registro', async () => {
    const usuario = userEvent.setup();
    simular({ '/api/comidas/estadisticas': VACIA });
    renderizarApp('/comidas');
    await usuario.click(await screen.findByRole('button', { name: 'Estadísticas' }));
    const vacio = (await screen.findByRole('heading', { name: 'Aún no hay comidas registradas esta semana' })).parentElement;
    await usuario.click(within(vacio).getByRole('button', { name: 'Registrar comida' }));
    expect(screen.getByRole('region', { name: 'Registrar comida' })).toBeInTheDocument();
  });

  // Revisión del PR #41: al cambiar a «Mes» y pulsar «Mes anterior» antes de que cargue, se consultaba noviembre en vez
  // de octubre porque las flechas usaban las fechas de la semana.
  test('mientras carga otro período las flechas esperan, y «Mes anterior» parte del mes que se ve', async () => {
    const usuario = userEvent.setup();
    const fetch = simular({ '/api/comidas/estadisticas': responder });
    const original = fetch.getMockImplementation();
    let soltarMes = null;
    fetch.mockImplementation((url, opciones) => (url.includes('periodo=mes') && !soltarMes
      ? new Promise((resolver) => { soltarMes = () => resolver(original(url, opciones)); })
      : original(url, opciones)));
    renderizarApp('/comidas');
    await usuario.click(await screen.findByRole('button', { name: 'Estadísticas' }));
    await screen.findByRole('heading', { name: 'Aún no hay comidas registradas esta semana' });

    await usuario.click(screen.getByRole('button', { name: 'Mes' }));
    await waitFor(() => expect(soltarMes).not.toBeNull());
    expect(screen.getByRole('button', { name: 'Mes anterior' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Mes siguiente' })).toBeDisabled();
    await usuario.click(screen.getByRole('button', { name: 'Mes anterior' }));
    expect(llamadasA(fetch, '/api/comidas/estadisticas').filter(([url]) => url.includes('periodo=mes'))).toHaveLength(1);

    soltarMes();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Mes anterior' })).toBeEnabled());
    await usuario.click(screen.getByRole('button', { name: 'Mes anterior' }));
    // El mes que se ve es octubre (MES): el anterior es septiembre, no noviembre.
    await waitFor(() => expect(parametro(llamadasA(fetch, '/api/comidas/estadisticas').at(-1)[0], 'fecha')).toBe('2026-09-30'));
  });
});

// Plan de alimentación (11-11-2026): según la meta del perfil (por defecto) o uno de la lista de personalizados, que rige
// desde el día en que se elige; y la meta de peso, que ajusta las calorías.
describe('Plan de alimentación', () => {
  const porcentajes = (proteinas, carbohidratos, grasas) => ({ proteinas, carbohidratos, grasas });
  const VOLUMEN = { id: 4, nombre: 'Volumen', porcentajes: porcentajes(40, 35, 25), proteinasG: 253, carbohidratosG: 221, grasasG: 70, enUso: false };
  const OPCIONES_BAJAR = { ritmos: [0.25, 0.5, 0.75], ritmoPorDefecto: 0.5, rango: { min: 56.7, max: 67.9, porImc: true } };
  function respuestaPlan({
    tipo = 'meta', desde = null, personalizadoId = null, nombre = null, propios = porcentajes(15, 55, 30), completo = true, lista = [],
    objetivo = 'mantener_peso', etiqueta = 'Mantener peso', metaPeso = null, opciones = null, kcal = 2525, ajusteKcal = 0, ritmo = null,
  } = {}) {
    const total = completo ? kcal : null;
    return {
      plan: { tipo, desde, personalizadoId, nombre, kcal: total, porcentajes: tipo === 'meta' ? porcentajes(15, 55, 30) : propios },
      meta: { valor: objetivo, etiqueta, ajusteCalorias: objetivo === 'bajar_peso' ? -0.15 : 0, ajusteKcal: completo ? ajusteKcal : null, ritmoSemanalKg: ritmo },
      metaPeso, opcionesMetaPeso: opciones,
      recomendado: { kcal: total, porcentajes: porcentajes(15, 55, 30), proteinasG: completo ? 95 : null, carbohidratosG: completo ? 347 : null, grasasG: completo ? 84 : null },
      perfil: { kcalBase: completo ? 2525 : null, pesoKg: completo ? 68 : null, completo },
      personalizados: lista, maxPersonalizados: 10,
    };
  }
  const resumenes = (fetch) => fetch.mock.calls.filter(([url, opciones]) => (url === '/api/comidas' || url.startsWith('/api/comidas?')) && (opciones?.method ?? 'GET') === 'GET').length;
  const llamada = (fetch, metodo, prefijo) => fetch.mock.calls.filter(([url, opciones]) => url.startsWith(prefijo) && opciones?.method === metodo).at(-1);
  // Simula la API del plan: la lectura responde «inicial» y cada cambio responde lo que diga «alCambiar».
  async function abrirPlan(usuario, inicial = respuestaPlan(), alCambiar = () => [200, inicial]) {
    const fetch = simular({
      '/api/comidas/plan': (url, { method, body }) => (method && method !== 'GET' ? alCambiar(url, method, body ? JSON.parse(body) : null) : [200, inicial]),
    });
    renderizarApp('/comidas');
    await usuario.click(within(await screen.findByRole('group', { name: 'Secciones de Comidas' })).getByRole('button', { name: 'Plan de alimentación' }));
    await screen.findByRole('heading', { name: 'Tu plan de alimentación' });
    return fetch;
  }
  const tarjetaPlan = () => screen.getByRole('heading', { name: 'Tu plan de alimentación' }).closest('section');
  const tarjetaPeso = () => screen.getByRole('heading', { name: 'Tu meta de peso' }).closest('section');

  test('muestra el plan de la meta con sus calorías, reparto y gramos, cómo se calcula y el acceso a nutricionistas', async () => {
    const usuario = userEvent.setup();
    await abrirPlan(usuario);
    const plan = tarjetaPlan();
    expect(plan).toHaveTextContent('Usas el plan según tu meta.');
    expect(within(plan).getByRole('button', { name: 'Según tu meta' })).toHaveAttribute('aria-pressed', 'true');
    expect(plan).toHaveTextContent('2.525 kcal al día');
    expect(plan).toHaveTextContent('Igual a tu gasto diario estimado.');
    expect(plan).toHaveTextContent('Meta: Mantener peso');
    expect(plan).toHaveTextContent('Comes lo que gastas, con 1,4 g de proteína por kilo y un 30 % de grasas.');
    expect(plan).toHaveTextContent('Proteínas15 %95 g');
    expect(plan).toHaveTextContent('Carbohidratos55 %347 g');
    expect(plan).toHaveTextContent('Grasas30 %84 g');
    expect(within(plan).getByRole('link', { name: 'Cambiar meta' })).toHaveAttribute('href', '/perfil');
    expect(within(plan).queryByRole('button', { name: 'Usar el plan de mi meta' })).not.toBeInTheDocument();
    // El plan no depende del día: no se muestra la navegación de días.
    expect(screen.queryByRole('navigation', { name: 'Día' })).not.toBeInTheDocument();
    // Con «Mantener peso» no hay meta de peso: se explica cuándo se puede fijar.
    expect(tarjetaPeso()).toHaveTextContent('Puedes fijar un peso al que llegar cuando tu meta sea «Bajar de peso» o «Aumentar masa muscular».');

    const calculo = screen.getByRole('heading', { name: 'Cómo se calcula' }).closest('section');
    expect(calculo).toHaveTextContent('no baja de 1.200 kcal en mujeres ni de 1.500 kcal en hombres');
    expect(calculo).toHaveTextContent('cerca de 7.700 kcal por kilo');
    expect(within(calculo).getByRole('link', { name: 'ISSN (2017): proteína y ejercicio' })).toHaveAttribute('target', '_blank');
    expect(screen.getByRole('link', { name: 'Buscar nutricionistas' })).toHaveAttribute('href', '/profesionales?especialidad=Nutrici%C3%B3n');
  });

  test('crea un plan personalizado desde la lista vacía, exige nombre y que sume 100 %, y lo usa desde hoy', async () => {
    const usuario = userEvent.setup();
    const creado = respuestaPlan({ tipo: 'personalizado', desde: HOY, personalizadoId: 4, nombre: 'Volumen', propios: porcentajes(40, 30, 30), lista: [{ ...VOLUMEN, porcentajes: porcentajes(40, 30, 30), enUso: true }] });
    const fetch = await abrirPlan(usuario, respuestaPlan(), () => [201, creado]);
    await usuario.click(screen.getByRole('button', { name: 'Personalizados' }));
    expect(screen.getByText(/Aún no tienes planes propios/)).toBeInTheDocument();
    expect(screen.getByText('0 de 10')).toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: /Crear plan personalizado/ }));

    expect(screen.getByRole('heading', { name: 'Nuevo plan personalizado' })).toBeInTheDocument();
    const guardar = screen.getByRole('button', { name: 'Guardar y usar desde hoy' });
    expect(screen.getByText('Ponle un nombre para encontrarlo en tu lista.')).toBeInTheDocument();
    expect(guardar).toBeDisabled();
    await usuario.type(screen.getByRole('textbox', { name: /Nombre/ }), 'Volumen');
    // Parte del reparto de la meta.
    const proteinas = screen.getByRole('spinbutton', { name: 'Proteínas' });
    expect(proteinas).toHaveValue(15);
    expect(screen.getByRole('slider', { name: 'Proteínas, deslizador' })).toHaveValue('15');
    expect(guardar).toBeEnabled();

    await usuario.clear(proteinas);
    await usuario.type(proteinas, '40');
    expect(screen.getByText(/Suman 125 %\. Quita 25 % para llegar a 100 %\./)).toBeInTheDocument();
    expect(guardar).toBeDisabled();
    expect(screen.getByText(/Fuera de lo recomendado \(10–35 %\)/)).toBeInTheDocument();
    expect(screen.getByText(/Tu proteína equivale a/)).toHaveTextContent('Tu proteína equivale a 3,7 g por kilo de peso; tu meta recomienda 1,4 g.');
    await usuario.click(screen.getByRole('button', { name: 'Ajustar carbohidratos a 30 %' }));
    expect(screen.getByRole('spinbutton', { name: 'Carbohidratos' })).toHaveValue(30);
    expect(screen.getByText('Suman 100 %')).toBeInTheDocument();
    expect(screen.getByText(/^253 g al día/)).toBeInTheDocument();

    const antes = resumenes(fetch);
    await usuario.click(guardar);
    expect(await screen.findByText('Listo: guardaste «Volumen» y lo usas desde hoy.')).toBeInTheDocument();
    expect(cuerpo(llamada(fetch, 'POST', '/api/comidas/plan/personalizados'))).toEqual({ nombre: 'Volumen', proteinas: 40, carbohidratos: 30, grasas: 30, usar: true });
    expect(screen.getByText('Usas «Volumen» desde el 26 de octubre.')).toBeInTheDocument();
    const lista = screen.getByRole('heading', { name: 'Volumen' }).closest('li');
    expect(lista).toHaveTextContent('En uso');
    expect(within(lista).queryByRole('button', { name: 'Usar desde hoy' })).not.toBeInTheDocument();
    // Al cambiar el plan, el resumen se vuelve a pedir para que el objetivo del día use el plan nuevo.
    await waitFor(() => expect(resumenes(fetch)).toBeGreaterThan(antes));
  });

  test('usa, edita y borra planes de la lista', async () => {
    const usuario = userEvent.setup();
    const DESCANSO = { ...VOLUMEN, id: 5, nombre: 'Descanso', porcentajes: porcentajes(30, 40, 30) };
    const inicial = respuestaPlan({ lista: [VOLUMEN, DESCANSO] });
    const fetch = await abrirPlan(usuario, inicial, (url, method, datos) => {
      if (method === 'PUT' && url === '/api/comidas/plan') return [200, respuestaPlan({ tipo: 'personalizado', desde: HOY, personalizadoId: 4, nombre: 'Volumen', propios: VOLUMEN.porcentajes, lista: [{ ...VOLUMEN, enUso: true }, DESCANSO] })];
      if (method === 'PUT') return [200, respuestaPlan({ lista: [VOLUMEN, { ...DESCANSO, nombre: datos.nombre, porcentajes: porcentajes(datos.proteinas, datos.carbohidratos, datos.grasas) }] })];
      return [200, respuestaPlan({ lista: [VOLUMEN] })];
    });
    await usuario.click(screen.getByRole('button', { name: 'Personalizados' }));
    expect(screen.getByText('2 de 10')).toBeInTheDocument();
    const volumen = screen.getByRole('heading', { name: 'Volumen' }).closest('li');
    expect(volumen).toHaveTextContent('Proteínas 40 %');

    await usuario.click(within(volumen).getByRole('button', { name: 'Usar desde hoy' }));
    expect(await screen.findByText('Listo: desde hoy usas «Volumen».')).toBeInTheDocument();
    expect(cuerpo(llamada(fetch, 'PUT', '/api/comidas/plan'))).toEqual({ tipo: 'personalizado', personalizadoId: 4 });

    await usuario.click(screen.getByRole('button', { name: 'Editar «Descanso»' }));
    expect(screen.getByRole('heading', { name: 'Editar «Descanso»' })).toBeInTheDocument();
    const nombre = screen.getByRole('textbox', { name: /Nombre/ });
    expect(nombre).toHaveValue('Descanso');
    await usuario.clear(nombre);
    await usuario.type(nombre, 'Días de descanso');
    await usuario.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    expect(await screen.findByText('Guardaste los cambios de «Días de descanso».')).toBeInTheDocument();
    expect(cuerpo(llamada(fetch, 'PUT', '/api/comidas/plan/personalizados/5'))).toEqual({ nombre: 'Días de descanso', proteinas: 30, carbohidratos: 40, grasas: 30 });

    await usuario.click(screen.getByRole('button', { name: 'Eliminar «Volumen»' }));
    expect(screen.getByText('¿Eliminar «Volumen»?')).toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: 'Eliminar' }));
    expect(await screen.findByText('Eliminaste «Volumen».')).toBeInTheDocument();
    expect(llamada(fetch, 'DELETE', '/api/comidas/plan/personalizados/4')).toBeDefined();
  });

  test('en el editor, un campo vacío o fuera de 5–80 no se puede guardar, y un error de la API se muestra', async () => {
    const usuario = userEvent.setup();
    await abrirPlan(usuario, respuestaPlan(), () => [409, { error: 'Ya tienes un plan con ese nombre' }]);
    await usuario.click(screen.getByRole('button', { name: 'Personalizados' }));
    await usuario.click(screen.getByRole('button', { name: /Crear plan personalizado/ }));
    await usuario.type(screen.getByRole('textbox', { name: /Nombre/ }), 'Volumen');
    const grasas = screen.getByRole('spinbutton', { name: 'Grasas' });
    await usuario.clear(grasas);
    expect(screen.getByText('Escribe un número entero entre 5 y 80.')).toBeInTheDocument();
    expect(grasas).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('button', { name: 'Solo guardar' })).toBeDisabled();
    await usuario.type(grasas, '90');
    expect(screen.getByText('Elige entre 5 % y 80 %.')).toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: 'Partir del reparto de mi meta' }));
    expect(grasas).toHaveValue(30);
    await usuario.click(screen.getByRole('button', { name: 'Solo guardar' }));
    expect(await screen.findByText('Ya tienes un plan con ese nombre')).toBeInTheDocument();
    // El editor sigue abierto para corregir el nombre.
    expect(screen.getByRole('heading', { name: 'Nuevo plan personalizado' })).toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.getByRole('heading', { name: 'Mis planes personalizados' })).toBeInTheDocument();
  });

  test('con un personalizado en uso, se puede volver al plan de la meta', async () => {
    const usuario = userEvent.setup();
    const fetch = await abrirPlan(
      usuario,
      respuestaPlan({ tipo: 'personalizado', desde: '2026-10-20', personalizadoId: 4, nombre: 'Volumen', propios: VOLUMEN.porcentajes, lista: [{ ...VOLUMEN, enUso: true }] }),
      () => [200, respuestaPlan({ desde: HOY, lista: [VOLUMEN] })],
    );
    expect(screen.getByText('Usas «Volumen» desde el 20 de octubre.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Personalizados' })).toHaveAttribute('aria-pressed', 'true');
    await usuario.click(screen.getByRole('button', { name: 'Según tu meta' }));
    expect(screen.getByText('Deja de usar «Volumen» desde hoy.')).toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: 'Usar el plan de mi meta' }));
    expect(await screen.findByText('Listo: desde hoy usas el plan según tu meta.')).toBeInTheDocument();
    expect(cuerpo(llamada(fetch, 'PUT', '/api/comidas/plan'))).toEqual({ tipo: 'meta' });
    expect(screen.getByText('Usas el plan según tu meta.')).toBeInTheDocument();
  });

  test('fija una meta de peso con su ritmo, muestra el avance y se puede quitar', async () => {
    const usuario = userEvent.setup();
    const base = { objetivo: 'bajar_peso', etiqueta: 'Bajar de peso', opciones: OPCIONES_BAJAR, kcal: 2146, ajusteKcal: -379 };
    const conMeta = respuestaPlan({
      ...base, kcal: 2250, ajusteKcal: -275, ritmo: 0.25,
      metaPeso: {
        objetivo: 'bajar_peso', aplica: true, pesoInicialKg: 68, pesoObjetivoKg: 63.5, pesoActualKg: 68, ritmoSemanalKg: 0.25, ajusteKcal: -275,
        fechaInicio: HOY, faltanKg: 4.5, alcanzada: false, semanas: 18, fechaEstimada: '2027-03-01', avancePct: 0,
      },
    });
    const fetch = await abrirPlan(usuario, respuestaPlan(base), (url, method) => [200, method === 'DELETE' ? respuestaPlan(base) : conMeta]);
    const peso = tarjetaPeso();
    const campo = within(peso).getByRole('textbox', { name: /Peso al que quieres llegar/ });
    const guardar = within(peso).getByRole('button', { name: 'Guardar meta de peso' });
    expect(peso).toHaveTextContent('Hoy pesas 68 kg. Puedes elegir entre 56,7 y 67,9 kg.');
    expect(guardar).toBeDisabled();
    await usuario.type(campo, '72');
    expect(peso).toHaveTextContent('Para bajar de peso, elige un peso menor a tu peso actual (68 kg).');
    expect(guardar).toBeDisabled();
    await usuario.clear(campo);
    await usuario.type(campo, '50');
    expect(peso).toHaveTextContent('Con tu altura, bajo 56,7 kg quedarías bajo el rango saludable (IMC 18,5).');
    await usuario.clear(campo);
    await usuario.type(campo, '63,5');
    // Ritmo moderado por defecto: 4,5 kg a 0,5 kg por semana son 9 semanas.
    expect(within(peso).getByRole('radio', { name: /Moderado/ })).toBeChecked();
    expect(peso).toHaveTextContent('(9 semanas)');
    await usuario.click(within(peso).getByRole('radio', { name: /Suave/ }));
    expect(peso).toHaveTextContent('(18 semanas)');
    expect(within(peso).getByRole('radio', { name: /Suave/ })).toHaveAccessibleName(/−275 kcal al día/);

    await usuario.click(guardar);
    expect(await within(tarjetaPeso()).findByText('Guardaste tu meta de peso; tus calorías ya siguen el ritmo que elegiste.')).toBeInTheDocument();
    expect(cuerpo(llamada(fetch, 'PUT', '/api/comidas/plan/meta-peso'))).toEqual({ pesoObjetivoKg: 63.5, ritmoSemanalKg: 0.25 });
    expect(tarjetaPeso()).toHaveTextContent('De 68 kg a 63,5 kg');
    expect(within(tarjetaPeso()).getByRole('progressbar', { name: 'Avance de tu meta de peso' })).toHaveAttribute('aria-valuenow', '0');
    expect(tarjetaPeso()).toHaveTextContent('Te faltan 4,5 kg. A 0,25 kg por semana llegarías cerca del 1 de marzo de 2027 (18 semanas).');
    expect(tarjetaPlan()).toHaveTextContent('Tu gasto diario estimado (2.525 kcal) menos 275 kcal, para bajar 0,25 kg por semana.');

    await usuario.click(within(tarjetaPeso()).getByRole('button', { name: 'Quitar meta' }));
    await usuario.click(within(tarjetaPeso()).getByRole('button', { name: 'Quitar' }));
    expect(await within(tarjetaPeso()).findByText('Quitaste tu meta de peso.')).toBeInTheDocument();
    expect(llamada(fetch, 'DELETE', '/api/comidas/plan/meta-peso')).toBeDefined();
  });

  test('con el perfil incompleto muestra el reparto sin calorías ni gramos e invita a completarlo', async () => {
    const usuario = userEvent.setup();
    await abrirPlan(usuario, respuestaPlan({ completo: false }));
    const plan = tarjetaPlan();
    expect(plan).toHaveTextContent('Completa tu peso, altura, edad, sexo y actividad física para calcular tus calorías y gramos.');
    expect(within(plan).getByRole('link', { name: 'Ir a mi perfil' })).toHaveAttribute('href', '/perfil');
    expect(plan).toHaveTextContent('— kcal al día');
    expect(plan).toHaveTextContent('Proteínas15 %—');
  });

  test('si el plan no carga muestra el error y permite reintentar', async () => {
    const usuario = userEvent.setup();
    // Falla hasta que se toca Reintentar (en desarrollo React monta dos veces y pide el plan dos veces).
    let falla = true;
    simular({ '/api/comidas/plan': () => (falla ? [500, { error: 'No pudimos cargar tu plan' }] : [200, respuestaPlan()]) });
    renderizarApp('/comidas');
    await usuario.click(within(await screen.findByRole('group', { name: 'Secciones de Comidas' })).getByRole('button', { name: 'Plan de alimentación' }));
    expect(await screen.findByText('No pudimos cargar tu plan')).toBeInTheDocument();
    falla = false;
    await usuario.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByRole('heading', { name: 'Tu plan de alimentación' })).toBeInTheDocument();
  });
});

// Gestor de alimentación (FS-HU-09 y FS-HU-10; mockup del PO del 26-10-2026).
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test } from 'vitest';
import reglas from '@shared/reglas.json';
import { llamadasA, renderizarApp, SESION, simularApi } from '../tests/utilidades.jsx';

const HOY = '2026-10-26';
const OBJETIVO = {
  calorias: 2525, proteinasG: 189, carbohidratosG: 284, grasasG: 70,
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

    // Plan de alimentación y Estadísticas todavía no existen: se muestran como Próximamente, sin botón.
    const pestanas = screen.getByRole('group', { name: 'Secciones de Comidas' });
    expect(within(pestanas).getAllByRole('button').map((boton) => boton.textContent)).toEqual(['Resumen', 'Comidas']);
    expect(within(pestanas).getAllByText('Próximamente')).toHaveLength(2);
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

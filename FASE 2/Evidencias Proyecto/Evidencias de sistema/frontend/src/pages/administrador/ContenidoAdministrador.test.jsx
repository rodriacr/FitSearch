// Contenido del administrador (FS-HU-30): especialidades, alimentos y establecimientos.
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test } from 'vitest';
import { llamadasA, renderizarApp, SESION, simularApi } from '../../tests/utilidades.jsx';

const pagina = (resultados) => ({ resultados, total: resultados.length, pagina: 1, totalPaginas: 1 });
const KINE = { id: 2, nombre: 'Kinesiología', activo: true, enUso: 3 };
const YOGA = { id: 9, nombre: 'Yoga terapéutico', activo: true, enUso: 0 };
const ARROZ = { id: 17, nombre: 'Arroz blanco cocido', sinonimos: 'arroz', calorias: 130, proteinasG: 2.7, carbohidratosG: 28.2, grasasG: 0.3, activo: false, enUso: 12 };
const RUTA = '/api/administrador/contenido';
const metodoDe = (llamada) => llamada[1].method ?? 'GET';
const cuerpoDe = (llamada) => JSON.parse(llamada[1].body);

beforeEach(() => sessionStorage.setItem('fitsearch_sesion', JSON.stringify({ ...SESION, usuario: { ...SESION.usuario, rol: 'administrador' } })));

test('el menú del administrador lleva a Contenido y lista cada catálogo con su uso y su estado', async () => {
  const fetch = simularApi({
    [`${RUTA}/especialidades`]: pagina([KINE, YOGA]),
    [`${RUTA}/alimentos`]: pagina([ARROZ]),
  });
  renderizarApp('/admin/dashboard');
  await userEvent.click(screen.getByRole('link', { name: 'Contenido' }));
  expect(await screen.findByRole('heading', { level: 1, name: 'Contenido' })).toBeInTheDocument();

  const lista = await screen.findByRole('list', { name: 'Especialidades' });
  const kine = within(lista).getByRole('heading', { name: 'Kinesiología' }).closest('li');
  expect(kine).toHaveTextContent('La usan las fichas de 3 profesionales');
  expect(kine).toHaveTextContent('Activa');
  expect(within(lista).getByRole('heading', { name: 'Yoga terapéutico' }).closest('li')).toHaveTextContent('Sin uso todavía');

  await userEvent.click(screen.getByRole('button', { name: 'Alimentos' }));
  const arroz = (await screen.findByRole('heading', { name: 'Arroz blanco cocido' })).closest('li');
  expect(arroz).toHaveTextContent('130 kcal · 2,7 g de proteínas · 28,2 g de carbohidratos · 0,3 g de grasas, por 100 g');
  expect(arroz).toHaveTextContent('Aparece en 12 registros de comidas');
  expect(arroz).toHaveTextContent('Inactivo');
  expect(within(arroz).getByRole('button', { name: 'Reactivar Arroz blanco cocido' })).toBeInTheDocument();
  expect(llamadasA(fetch, `${RUTA}/alimentos?`)).toHaveLength(1);
});

describe('agregar y editar', () => {
  test('agrega una especialidad y muestra en su campo el error que devuelve la API', async () => {
    let intento = 0;
    const fetch = simularApi({
      [`${RUTA}/especialidades`]: (url, { method }) => {
        if (method !== 'POST') return [200, pagina([KINE])];
        intento += 1;
        return intento === 1
          ? [409, { error: 'Ya existe una especialidad con ese nombre', detalles: { nombre: 'Ya existe una especialidad con ese nombre' } }]
          : [201, { elemento: YOGA }];
      },
    });
    renderizarApp('/admin/contenido');
    await userEvent.click(await screen.findByRole('button', { name: /Agregar especialidad/ }));
    const formulario = screen.getByRole('form', { name: 'Agregar especialidad' });
    await userEvent.type(within(formulario).getByLabelText('Nombre'), 'Kinesiologia');
    await userEvent.click(within(formulario).getByRole('button', { name: 'Guardar' }));
    expect(await within(formulario).findByText('Ya existe una especialidad con ese nombre', { selector: 'small' })).toBeInTheDocument();
    expect(within(formulario).getByLabelText('Nombre')).toHaveAttribute('aria-invalid', 'true');

    await userEvent.clear(within(formulario).getByLabelText('Nombre'));
    await userEvent.type(within(formulario).getByLabelText('Nombre'), 'Yoga terapéutico');
    await userEvent.click(within(formulario).getByRole('button', { name: 'Guardar' }));
    expect(await screen.findByText('«Yoga terapéutico» quedó agregada.')).toBeInTheDocument();
    expect(screen.queryByRole('form', { name: 'Agregar especialidad' })).not.toBeInTheDocument();
    const envios = fetch.mock.calls.filter((llamada) => metodoDe(llamada) === 'POST');
    expect(cuerpoDe(envios.at(-1))).toEqual({ nombre: 'Yoga terapéutico' });
  });

  test('edita un alimento: los decimales con coma se envían como número', async () => {
    const fetch = simularApi({
      [`${RUTA}/alimentos`]: pagina([{ ...ARROZ, activo: true }]),
      [`${RUTA}/alimentos/17`]: (url, { method }) => [200, { elemento: { ...ARROZ, calorias: 131, activo: true, method } }],
    });
    renderizarApp('/admin/contenido');
    await userEvent.click(await screen.findByRole('button', { name: 'Alimentos' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Editar Arroz blanco cocido' }));
    const formulario = screen.getByRole('form', { name: 'Editar alimento' });
    expect(within(formulario).getByLabelText('Proteínas (g por 100 g)')).toHaveValue('2,7');
    await userEvent.clear(within(formulario).getByLabelText('Calorías (kcal por 100 g)'));
    await userEvent.type(within(formulario).getByLabelText('Calorías (kcal por 100 g)'), '130,5');
    await userEvent.click(within(formulario).getByRole('button', { name: 'Guardar' }));
    expect(await screen.findByText('«Arroz blanco cocido» quedó actualizado.')).toBeInTheDocument();
    const envio = fetch.mock.calls.find((llamada) => metodoDe(llamada) === 'PUT');
    expect(envio[0]).toBe(`${RUTA}/alimentos/17`);
    expect(cuerpoDe(envio)).toEqual({ nombre: 'Arroz blanco cocido', sinonimos: 'arroz', calorias: 130.5, proteinasG: 2.7, carbohidratosG: 28.2, grasasG: 0.3 });
  });

  test('un establecimiento busca su ubicación con la comuna y la dirección y la guarda', async () => {
    const fetch = simularApi({
      [`${RUTA}/establecimientos/ubicacion`]: { lat: -33.4569, lng: -70.5976, precision: 'exacta', encontrada: 'Avenida Irarrázaval 3000, Ñuñoa' },
      [`${RUTA}/establecimientos`]: (url, { method }) => (method === 'POST'
        ? [201, { elemento: { id: 3, ...JSON.parse(fetch.mock.calls.at(-1)[1].body), activo: true, enUso: 0 } }]
        : [200, pagina([])]),
    });
    renderizarApp('/admin/contenido');
    await userEvent.click(await screen.findByRole('button', { name: 'Establecimientos' }));
    expect(await screen.findByText('No hay establecimientos para estos filtros.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Agregar establecimiento/ }));
    const formulario = screen.getByRole('form', { name: 'Agregar establecimiento' });
    await userEvent.type(within(formulario).getByLabelText('Nombre'), 'Gimnasio Demo Ñuñoa');
    await userEvent.selectOptions(within(formulario).getByLabelText('Categoría'), 'gimnasio');
    await userEvent.type(within(formulario).getByLabelText('Comuna'), 'Ñuñoa');
    await userEvent.type(within(formulario).getByLabelText('Dirección'), 'Av. Irarrázaval 3000');
    await userEvent.click(within(formulario).getByRole('button', { name: /Buscar la ubicación/ }));
    expect(await within(formulario).findByText('Encontramos Avenida Irarrázaval 3000, Ñuñoa.')).toBeInTheDocument();
    expect(within(formulario).getByLabelText('Latitud')).toHaveValue('-33,4569');
    expect(new URL(llamadasA(fetch, `${RUTA}/establecimientos/ubicacion`)[0][0], 'http://localhost').searchParams.get('direccion')).toBe('Av. Irarrázaval 3000');
    await userEvent.click(within(formulario).getByRole('button', { name: 'Guardar' }));
    expect(await screen.findByText('«Gimnasio Demo Ñuñoa» quedó agregado.')).toBeInTheDocument();
    expect(cuerpoDe(fetch.mock.calls.find((llamada) => metodoDe(llamada) === 'POST'))).toEqual({
      nombre: 'Gimnasio Demo Ñuñoa', categoria: 'gimnasio', comuna: 'Ñuñoa', direccion: 'Av. Irarrázaval 3000', ubicacionLat: -33.4569, ubicacionLng: -70.5976,
    });
  });
});

describe('desactivar y eliminar', () => {
  test('lo que está en uso no se elimina: ofrece desactivarlo y no llama a DELETE', async () => {
    const fetch = simularApi({
      [`${RUTA}/especialidades`]: pagina([KINE]),
      [`${RUTA}/especialidades/2/estado`]: { elemento: { ...KINE, activo: false } },
    });
    renderizarApp('/admin/contenido');
    await userEvent.click(await screen.findByRole('button', { name: 'Eliminar Kinesiología' }));
    expect(screen.getByRole('heading', { name: 'No se puede eliminar «Kinesiología»' })).toBeInTheDocument();
    expect(screen.getByText(/La usan las fichas de 3 profesionales\. Si la eliminas se perdería ese historial\. Puedes desactivarla/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Desactivar especialidad' }));
    expect(await screen.findByText('«Kinesiología» quedó inactiva.')).toBeInTheDocument();
    const cambio = fetch.mock.calls.find((llamada) => metodoDe(llamada) === 'PATCH');
    expect(cambio[0]).toBe(`${RUTA}/especialidades/2/estado`);
    expect(cuerpoDe(cambio)).toEqual({ activo: false });
    expect(fetch.mock.calls.some((llamada) => metodoDe(llamada) === 'DELETE')).toBe(false);
  });

  test('lo que nadie usa se elimina después de confirmar', async () => {
    const fetch = simularApi({
      [`${RUTA}/especialidades`]: pagina([YOGA]),
      [`${RUTA}/especialidades/9`]: () => [204],
    });
    renderizarApp('/admin/contenido');
    await userEvent.click(await screen.findByRole('button', { name: 'Eliminar Yoga terapéutico' }));
    expect(screen.getByText('Nadie la usa todavía. Esta acción no se puede deshacer.')).toBeInTheDocument();
    expect(fetch.mock.calls.some((llamada) => metodoDe(llamada) === 'DELETE')).toBe(false);
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar eliminación' }));
    expect(await screen.findByText('«Yoga terapéutico» se eliminó.')).toBeInTheDocument();
    expect(fetch.mock.calls.find((llamada) => metodoDe(llamada) === 'DELETE')[0]).toBe(`${RUTA}/especialidades/9`);
  });

  test('si la API responde que ahora está en uso, muestra su motivo y ofrece desactivarlo', async () => {
    simularApi({
      [`${RUTA}/especialidades`]: pagina([YOGA]),
      [`${RUTA}/especialidades/9`]: () => [409, { error: 'No se puede eliminar «Yoga terapéutico»: la usa la ficha de 1 profesional. Puedes desactivarla para que no aparezca en fichas nuevas.', detalles: { enUso: 1 } }],
    });
    renderizarApp('/admin/contenido');
    await userEvent.click(await screen.findByRole('button', { name: 'Eliminar Yoga terapéutico' }));
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar eliminación' }));
    expect(await screen.findByText(/la usa la ficha de 1 profesional/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Desactivar especialidad' })).toBeInTheDocument();
  });
});

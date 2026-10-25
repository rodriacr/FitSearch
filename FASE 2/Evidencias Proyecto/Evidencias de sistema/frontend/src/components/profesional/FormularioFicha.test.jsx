// Ubicación de atención de la ficha (SC-28): el profesional escribe su comuna y su dirección, la API las ubica y el
// mapa muestra el lugar; si no quedó exacto, mueve el marcador. Ya no hay campos de latitud ni longitud.
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { cargarMapLibre } from '../../services/mapas.js';
import { MI_FICHA, respuestaJson } from '../../tests/utilidades.jsx';
import FormularioFicha from './FormularioFicha.jsx';
vi.mock('../../services/mapas.js', () => ({ cargarMapLibre: vi.fn(), ESTILO_MAPA: 'https://estilo.prueba/style.json' }));

const PROVIDENCIA = { lat: -33.4290115, lng: -70.6211027, precision: 'exacta', encontrada: 'Avenida Providencia 1234, Providencia' };
// 1 píxel = 0,00001 grados: las flechas mueven el marcador 10 píxeles.
const ESCALA = 1e5;

// MapLibre simulado: el mapa carga de inmediato; el marcador se puede arrastrar (arrastrar) y el mapa recibir clics (clic).
function simularMapLibre({ falla = false } = {}) {
  const registro = { mapas: [], marcadores: [], easeTo: vi.fn() };
  class Map {
    constructor(opciones) {
      if (falla) throw new Error('Mapa no disponible');
      this.opciones = opciones; this.oyentes = {}; this.remove = vi.fn(); registro.mapas.push(this);
    }
    once(evento, cb) { if (evento === 'load') queueMicrotask(cb); }
    on(evento, cb) { (this.oyentes[evento] ??= []).push(cb); return this; }
    off() { return this; }
    addControl() {}
    easeTo(opciones) { registro.easeTo(opciones); }
    project({ lng, lat }) { return { x: lng * ESCALA, y: -lat * ESCALA }; }
    unproject([x, y]) { return { lng: x / ESCALA, lat: -y / ESCALA }; }
    clic(lng, lat, target = this.opciones.container) { this.oyentes.click.forEach((cb) => cb({ lngLat: { lng, lat }, originalEvent: { target } })); }
  }
  class Marker {
    constructor(opciones) { this.opciones = opciones; this.elemento = opciones.element; this.oyentes = {}; registro.marcadores.push(this); }
    setLngLat(p) { this.lngLat = Array.isArray(p) ? { lng: p[0], lat: p[1] } : { lng: p.lng, lat: p.lat }; return this; }
    getLngLat() { return this.lngLat; }
    addTo(mapa) { mapa.opciones.container.append(this.elemento); return this; }
    on(evento, cb) { this.oyentes[evento] = cb; return this; }
    arrastrar(lng, lat) { this.lngLat = { lng, lat }; this.oyentes.dragend(); }
  }
  cargarMapLibre.mockResolvedValue({ Map, Marker, NavigationControl: class {} });
  return registro;
}

// Servidor simulado: la búsqueda de la ubicación (configurable) y el guardado de la ficha.
function simularServidor({ ubicar = () => respuestaJson(200, PROVIDENCIA), alGuardar } = {}) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation((url, opciones = {}) => {
    const direccion = new URL(url, 'http://localhost');
    if (direccion.pathname === '/api/profesionales/mi-ficha/ubicacion') return ubicar(Object.fromEntries(direccion.searchParams));
    if (direccion.pathname === '/api/profesionales/mi-ficha' && opciones.method === 'PUT') {
      return alGuardar ? alGuardar() : respuestaJson(200, { ficha: { id: 3, ...JSON.parse(opciones.body) } });
    }
    return respuestaJson(404, { error: 'Recurso no encontrado' });
  });
}
const busquedas = (fetch) => fetch.mock.calls.filter(([url]) => url.startsWith('/api/profesionales/mi-ficha/ubicacion'));
// Consultas enviadas a la búsqueda de la ubicación, en orden. Al salir del campo Comuna ya se busca la comuna (el mapa
// aparece antes de escribir la dirección) y al salir de Dirección se busca la dirección.
const consultas = (fetch) => busquedas(fetch).map(([url]) => new URL(url, 'http://localhost').searchParams.toString());
const COMUNA = 'comuna=Providencia';
const CON_DIRECCION = 'comuna=Providencia&direccion=Av.+Providencia+1234%2C+oficina+501';
const cuerpoPut = (fetch) => JSON.parse(fetch.mock.calls.find(([, o = {}]) => o.method === 'PUT')[1].body);
const huboPut = (fetch) => fetch.mock.calls.some(([, o = {}]) => o.method === 'PUT');

async function completar({ modalidad = 'presencial', comuna = 'Providencia', direccion = 'Av. Providencia 1234, oficina 501' } = {}) {
  await userEvent.selectOptions(screen.getByLabelText('Especialidad (obligatorio)'), 'Nutrición');
  await userEvent.selectOptions(screen.getByLabelText('Modalidad de atención (obligatorio)'), modalidad);
  await userEvent.type(screen.getByLabelText('Comuna (obligatorio)'), comuna);
  if (direccion) await userEvent.type(screen.getByLabelText(/^Dirección de atención/), direccion);
}
const salirDelCampo = () => userEvent.click(screen.getByText('Ubicación de atención'));
const guardar = () => userEvent.click(screen.getByRole('button', { name: /Guardar perfil/ }));
const formulario = (props = {}) => render(<FormularioFicha ficha={null} onGuardado={vi.fn()} {...props} />);

beforeEach(() => cargarMapLibre.mockReset());

describe('Nueva ficha', () => {
  test('no pide coordenadas: al escribir la dirección la ubica en el mapa y dice qué encontró', async () => {
    const registro = simularMapLibre();
    const fetch = simularServidor();
    formulario();

    expect(screen.queryByLabelText(/Latitud|Longitud/)).not.toBeInTheDocument();
    expect(screen.queryByText(/coordenadas/)).not.toBeInTheDocument();
    expect(screen.getByText('Escribe tu comuna y tu dirección para ver tu lugar de atención en el mapa.')).toBeInTheDocument();

    await completar();
    await salirDelCampo();

    expect(await screen.findByText('Encontramos Avenida Providencia 1234, Providencia.')).toBeInTheDocument();
    expect(consultas(fetch)).toEqual([COMUNA, CON_DIRECCION]);
    await waitFor(() => expect(registro.marcadores).toHaveLength(1));
    const [marcador] = registro.marcadores;
    expect(marcador.opciones).toMatchObject({ draggable: true, anchor: 'bottom' });
    expect(marcador.getLngLat()).toEqual({ lng: -70.6211027, lat: -33.4290115 });
    expect(registro.mapas[0].opciones).toMatchObject({ center: [-70.6211027, -33.4290115], zoom: 16, cooperativeGestures: true });
    expect(screen.getByRole('button', { name: /Tu lugar de atención/ })).toBeInTheDocument();
  });

  test('al guardar envía las coordenadas encontradas, sin buscar la misma dirección dos veces', async () => {
    simularMapLibre();
    const fetch = simularServidor();
    const onGuardado = vi.fn();
    formulario({ onGuardado });

    // Guardar justo después de escribir: la búsqueda que empieza al salir del campo es la que se usa al guardar.
    await completar();
    await guardar();

    await waitFor(() => expect(onGuardado).toHaveBeenCalled());
    expect(consultas(fetch)).toEqual([COMUNA, CON_DIRECCION]);
    expect(cuerpoPut(fetch)).toEqual({
      especialidad: 'Nutrición', descripcion: '', comuna: 'Providencia', direccion: 'Av. Providencia 1234, oficina 501',
      modalidad: 'presencial', ubicacionLat: -33.4290115, ubicacionLng: -70.6211027,
    });
  });

  test('si encuentra la calle pero no el número, pide mover el marcador', async () => {
    simularMapLibre();
    simularServidor({ ubicar: () => respuestaJson(200, { ...PROVIDENCIA, precision: 'calle', encontrada: 'Avenida Barros Luco, San Antonio' }) });
    formulario();
    await completar({ comuna: 'San Antonio', direccion: 'Barros Luco 1500' });
    await salirDelCampo();
    expect(await screen.findByText(
      'Encontramos la calle (Avenida Barros Luco, San Antonio), pero no el número: mueve el marcador hasta tu lugar de atención.',
    )).toBeInTheDocument();
  });

  test('si no encuentra la dirección lo dice y deja el marcador en el centro de la comuna', async () => {
    const registro = simularMapLibre();
    simularServidor({ ubicar: () => respuestaJson(200, { lat: -33.58, lng: -71.61, precision: 'comuna', encontrada: 'San Antonio' }) });
    formulario();
    await completar({ comuna: 'San Antonio', direccion: 'Calle Inventada 99999' });
    await salirDelCampo();
    expect(await screen.findByText(/^No encontramos esa dirección en San Antonio: el marcador quedó en el centro de la comuna/)).toBeInTheDocument();
    await waitFor(() => expect(registro.mapas[0].opciones.zoom).toBe(12));
  });

  test('si atiende solo online basta la comuna', async () => {
    simularMapLibre();
    const fetch = simularServidor({ ubicar: () => respuestaJson(200, { lat: -33.58, lng: -71.61, precision: 'comuna', encontrada: 'San Antonio' }) });
    formulario();
    await completar({ modalidad: 'online', comuna: 'San Antonio', direccion: '' });
    await guardar();

    expect(await screen.findByText('Atiendes solo online: el marcador queda en el centro de San Antonio.')).toBeInTheDocument();
    expect(consultas(fetch)).toEqual(['comuna=San+Antonio']);
    expect(cuerpoPut(fetch)).toMatchObject({ modalidad: 'online', direccion: '', ubicacionLat: -33.58, ubicacionLng: -71.61 });
  });

  test('una comuna que no existe se marca en su campo y no se guarda', async () => {
    simularMapLibre();
    const fetch = simularServidor({
      ubicar: () => respuestaJson(404, { error: 'No encontramos esa comuna en Chile', detalles: { comuna: 'No encontramos esa comuna en Chile. Revisa cómo está escrita.' } }),
    });
    formulario();
    await completar({ comuna: 'Comuna Falsa', direccion: 'Calle 1' });
    await guardar();

    expect(await screen.findByText('No encontramos esa comuna en Chile. Revisa cómo está escrita.')).toBeInTheDocument();
    expect(screen.getByLabelText('Comuna (obligatorio)')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText(/^No pudimos ubicar tu lugar de atención en el mapa/)).toBeInTheDocument();
    expect(huboPut(fetch)).toBe(false);
  });

  test('si el buscador de direcciones no responde, avisa y permite buscar de nuevo', async () => {
    simularMapLibre();
    let fallas = 1;
    const fetch = simularServidor({
      ubicar: ({ direccion }) => (direccion && fallas-- > 0
        ? respuestaJson(503, { error: 'No pudimos buscar tu dirección en este momento. Intenta de nuevo en unos segundos.' })
        : respuestaJson(200, PROVIDENCIA)),
    });
    formulario();
    await completar();
    await salirDelCampo();

    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos buscar tu dirección en este momento.');
    await userEvent.click(screen.getByRole('button', { name: 'Buscar de nuevo' }));
    expect(await screen.findByText('Encontramos Avenida Providencia 1234, Providencia.')).toBeInTheDocument();
    expect(consultas(fetch)).toEqual([COMUNA, CON_DIRECCION, CON_DIRECCION]);
  });
});

describe('Ajustar el marcador', () => {
  async function conMapa() {
    const registro = simularMapLibre();
    const fetch = simularServidor();
    formulario();
    await completar();
    await salirDelCampo();
    await waitFor(() => expect(registro.marcadores).toHaveLength(1));
    return { registro, fetch, marcador: registro.marcadores[0], mapa: registro.mapas[0] };
  }

  test('arrastrarlo guarda ese punto (con 7 decimales) sin volver a buscar ni mover el mapa', async () => {
    const { registro, fetch, marcador } = await conMapa();
    registro.easeTo.mockClear();

    marcador.arrastrar(-70.621512345678, -33.429334567891);
    expect(await screen.findByText('Ajustaste el marcador: guardaremos ese punto como tu lugar de atención.')).toBeInTheDocument();
    expect(registro.easeTo).not.toHaveBeenCalled();
    await guardar();

    await waitFor(() => expect(huboPut(fetch)).toBe(true));
    expect(cuerpoPut(fetch)).toMatchObject({ ubicacionLat: -33.4293346, ubicacionLng: -70.6215123 });
    expect(consultas(fetch)).toEqual([COMUNA, CON_DIRECCION]);
  });

  test('un clic en el mapa lleva el marcador ahí; un clic sobre el marcador no lo mueve', async () => {
    const { mapa, marcador } = await conMapa();
    mapa.clic(-70.62, -33.43, marcador.elemento);
    expect(marcador.getLngLat()).toEqual({ lng: -70.6211027, lat: -33.4290115 });

    mapa.clic(-70.62, -33.43);
    await waitFor(() => expect(marcador.getLngLat()).toEqual({ lng: -70.62, lat: -33.43 }));
  });

  test('con el teclado se mueve con las flechas (Mayús para pasos más largos)', async () => {
    const { marcador } = await conMapa();
    const boton = screen.getByRole('button', { name: /Tu lugar de atención/ });
    boton.focus();

    await userEvent.keyboard('{ArrowRight}');
    await waitFor(() => expect(marcador.getLngLat().lng).toBeCloseTo(-70.6210027, 7));
    await userEvent.keyboard('{Shift>}{ArrowUp}{/Shift}');
    await waitFor(() => expect(marcador.getLngLat().lat).toBeCloseTo(-33.4285115, 7));
    // Varias flechas seguidas, sin esperar a que React vuelva a dibujar, suman su recorrido.
    fireEvent.keyDown(boton, { key: 'ArrowLeft' });
    fireEvent.keyDown(boton, { key: 'ArrowLeft' });
    expect(marcador.getLngLat().lng).toBeCloseTo(-70.6212027, 7);
  });

  test('si cambia la dirección se busca de nuevo y el marcador vuelve al lugar encontrado', async () => {
    const { registro, fetch, marcador } = await conMapa();
    marcador.arrastrar(-70.7, -33.5);
    fetch.mockImplementation((url) => (url.includes('/ubicacion')
      ? respuestaJson(200, { lat: -33.43, lng: -70.62, precision: 'exacta', encontrada: 'Avenida Providencia 1500, Providencia' })
      : respuestaJson(404, {})));

    await userEvent.clear(screen.getByLabelText(/^Dirección de atención/));
    await userEvent.type(screen.getByLabelText(/^Dirección de atención/), 'Av. Providencia 1500');
    await salirDelCampo();

    expect(await screen.findByText('Encontramos Avenida Providencia 1500, Providencia.')).toBeInTheDocument();
    expect(marcador.getLngLat()).toEqual({ lng: -70.62, lat: -33.43 });
    expect(registro.easeTo).toHaveBeenLastCalledWith(expect.objectContaining({ center: [-70.62, -33.43], zoom: 16 }));
  });
});

describe('Editar ficha', () => {
  test('muestra la ubicación guardada sin buscarla y, si no cambia la dirección, guarda las mismas coordenadas', async () => {
    const registro = simularMapLibre();
    const fetch = simularServidor();
    formulario({ ficha: { ...MI_FICHA, direccion: 'Av. Italia 850' }, onCancelar: vi.fn() });

    expect(await screen.findByText(/^Esta es la ubicación guardada en tu ficha/)).toBeInTheDocument();
    await waitFor(() => expect(registro.marcadores).toHaveLength(1));
    expect(registro.marcadores[0].getLngLat()).toEqual({ lng: -70.6116, lat: -33.4263 });
    await guardar();

    await waitFor(() => expect(huboPut(fetch)).toBe(true));
    expect(cuerpoPut(fetch)).toMatchObject({ ubicacionLat: -33.4263, ubicacionLng: -70.6116 });
    expect(busquedas(fetch)).toHaveLength(0);
  });

  test('una ubicación guardada fuera de Chile no se muestra: se busca con la dirección', async () => {
    simularMapLibre();
    const fetch = simularServidor();
    formulario({ ficha: { ...MI_FICHA, direccion: 'Av. Providencia 1234', ubicacionLat: -90, ubicacionLng: -90 } });

    expect(screen.getByText('Escribe tu comuna y tu dirección para ver tu lugar de atención en el mapa.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Ver en el mapa' }));
    expect(await screen.findByText('Encontramos Avenida Providencia 1234, Providencia.')).toBeInTheDocument();
    await guardar();
    await waitFor(() => expect(huboPut(fetch)).toBe(true));
    expect(cuerpoPut(fetch)).toMatchObject({ ubicacionLat: -33.4290115, ubicacionLng: -70.6211027 });
  });

  test('si el mapa no carga lo dice, permite reintentar y la ubicación se guarda igual', async () => {
    simularMapLibre({ falla: true });
    const fetch = simularServidor();
    formulario({ ficha: { ...MI_FICHA, direccion: 'Av. Italia 850' } });

    expect(await screen.findByText(/No se pudo cargar el mapa. Tu ubicación se guarda igual./)).toBeInTheDocument();
    const registro = simularMapLibre();
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar mapa' }));
    await waitFor(() => expect(registro.marcadores).toHaveLength(1));
    await guardar();
    await waitFor(() => expect(huboPut(fetch)).toBe(true));
  });
});

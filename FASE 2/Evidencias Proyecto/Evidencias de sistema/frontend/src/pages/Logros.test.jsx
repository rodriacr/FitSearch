// Mis logros (25-11-2026): vitrina y nivel, colecciones, cerca, temporada, secretas, historial, aviso de medalla nueva
// y errores de la API.
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, test } from 'vitest';
import Logros from './Logros.jsx';
import { llamadasA, SESION, simularApi } from '../tests/utilidades.jsx';

beforeEach(() => sessionStorage.setItem('fitsearch_sesion', JSON.stringify(SESION)));

const NIV = ['bronce', 'plata', 'oro', 'platino'];
const coleccion = (clave, nombre, obtenidas, valor = 0) => ({
  clave, nombre, descripcion: `Descripción de ${nombre}`, icono: 'gota', color: '#1aa3d9', obtenidas,
  niveles: NIV.map((nivel, k) => ({ nivel, meta: [3, 10, 30, 100][k], etiqueta: `${[3, 10, 30, 100][k]} días`, valor: k < obtenidas ? [3, 10, 30, 100][k] : valor, obtenida: k < obtenidas, fecha: null })),
});
const medalla = (nombre, nivel, extra = {}) => ({ clave: nombre.toLowerCase(), nivel, periodo: '', icono: 'gota', color: '#1aa3d9', nombre, descripcion: `Ganaste ${nombre}`, puntos: 50, fecha: '2026-11-20T15:00:00.000Z', ...extra });
function logros(extra = {}) {
  return {
    hoy: '2026-11-25',
    nivel: { numero: 3, nombre: 'Activo', puntos: 300, desde: 250, siguiente: { numero: 4, nombre: 'Comprometido', desde: 450 }, progreso: 0.25 },
    totales: { obtenidas: 5, total: 27 },
    racha: { actual: 7, descansoDisponible: true },
    sinMeta: false,
    colecciones: [coleccion('hidratacion', 'Hidratación', 1, 6), coleccion('explorador', 'Explorador', 4)],
    temporada: [
      { clave: 'noviembre-constante', nombre: 'Noviembre constante', descripcion: 'Registra 15 días', icono: 'rayo', inicio: '2026-11-01', termino: '2026-11-30', periodo: '2026', activa: true, meta: 15, valor: 9, obtenida: false, fecha: null },
      { clave: 'fiestas-equilibrio', nombre: 'Fiestas en equilibrio', descripcion: '12 días cerca', icono: 'estrella', inicio: '2026-12-01', termino: '2026-12-31', periodo: '2026', activa: false, meta: 12, valor: 0, obtenida: false, fecha: null },
    ],
    secretas: [
      { clave: 'madrugador', icono: 'amanecer', pista: 'Temprano', meta: 5, valor: 5, obtenida: true, fecha: '2026-11-09T12:00:00.000Z', nombre: 'Madrugador', descripcion: 'Registraste 5 desayunos antes de las 8:00' },
      { clave: 'finde', icono: 'calendario', pista: 'Sábado y domingo', meta: 4, valor: 1, obtenida: false, fecha: null, nombre: null, descripcion: null },
    ],
    cerca: [{ clave: 'hidratacion', nombre: 'Hidratación · Plata', nivel: 'plata', icono: 'gota', color: '#1aa3d9', etiqueta: '10 días', valor: 6, meta: 10, faltan: 4 }],
    destacadas: [medalla('Explorador · Platino', 'platino'), medalla('Hidratación · Bronce', 'bronce')],
    historial: [medalla('Explorador · Platino', 'platino', { puntos: 500 }), medalla('Hidratación · Bronce', 'bronce')],
    nuevas: [],
    ...extra,
  };
}
function mostrar(respuesta) {
  const fetch = simularApi({ '/api/logros': respuesta });
  render(<MemoryRouter><Logros /></MemoryRouter>);
  return fetch;
}
const seccion = (nombre) => screen.getByRole('heading', { name: nombre }).closest('section');

describe('Mis logros', () => {
  test('muestra el nivel, la vitrina y las cifras de la persona', async () => {
    mostrar(logros());
    expect(await screen.findByText('Activo')).toBeInTheDocument();
    const vitrina = seccion('Tu nivel de bienestar');
    expect(within(vitrina).getByText(/Al nivel 4 llegas a/)).toHaveTextContent('«Comprometido»');
    expect(within(vitrina).getByText('300 puntos')).toBeInTheDocument();
    expect(within(vitrina).getByText('Faltan 150')).toBeInTheDocument();
    expect(within(vitrina).getByText(/5 de 27 medallas/)).toBeInTheDocument();
    expect(within(vitrina).getByText(/Racha de 7 días/)).toBeInTheDocument();
    expect(within(vitrina).getByText('La más reciente')).toBeInTheDocument();
    expect(within(vitrina).getByRole('progressbar', { name: 'Avance al siguiente nivel' })).toHaveAttribute('aria-valuenow', '25');
  });

  test('cada colección muestra sus cuatro niveles, cuáles tiene y cuánto falta', async () => {
    mostrar(logros());
    const colecciones = await screen.findByRole('heading', { name: 'Colecciones' });
    const lista = colecciones.closest('section');
    expect(within(lista).getByRole('img', { name: 'Hidratación Bronce: obtenida' })).toBeInTheDocument();
    expect(within(lista).getByRole('img', { name: 'Hidratación Plata: pendiente' })).toBeInTheDocument();
    expect(within(lista).getByText('Plata: 6 de 10')).toBeInTheDocument();
    expect(within(lista).getByText('¡Colección completa!')).toBeInTheDocument();
    expect(within(lista).getByText(/no los días bajo ella/)).toBeInTheDocument();
  });

  test('muestra lo que está cerca, la temporada, las secretas y el historial', async () => {
    mostrar(logros());
    await screen.findByText('Activo');
    expect(within(seccion('Estás cerca de…')).getByText('Faltan 4')).toBeInTheDocument();
    const temporada = seccion('Retos de temporada');
    expect(within(temporada).getByText('Hasta el 30 nov')).toBeInTheDocument();
    expect(within(temporada).getByText('9 de 15 días')).toBeInTheDocument();
    expect(within(temporada).getByText('Empieza el 1 dic')).toBeInTheDocument();
    const secretas = seccion('Secretas');
    expect(within(secretas).getByText('Madrugador')).toBeInTheDocument();
    expect(within(secretas).getByText('???')).toBeInTheDocument();
    expect(within(secretas).getByText('Pista: Sábado y domingo')).toBeInTheDocument();
    expect(within(seccion('Tu historia')).getByText(/\+500 puntos/)).toBeInTheDocument();
  });

  test('sin medallas, la vitrina y los paneles invitan a empezar', async () => {
    mostrar(logros({ destacadas: [], historial: [], cerca: [], sinMeta: true }));
    expect(await screen.findByText(/Tu vitrina está esperando su primera medalla/)).toBeInTheDocument();
    expect(screen.getByText(/Aquí aparecerá cada medalla que ganes/)).toBeInTheDocument();
    expect(screen.getByText(/Completa tu perfil para calcular tu meta/)).toBeInTheDocument();
  });

  test('celebra las medallas nuevas una a una y, al terminar, las marca como vistas', async () => {
    const fetch = mostrar(logros({ nuevas: [medalla('Hidratación · Oro', 'oro', { puntos: 250 }), medalla('Madrugador', 'secreta', { puntos: 150 })] }));
    const dialogo = await screen.findByRole('dialog', { name: 'Hidratación · Oro' });
    expect(within(dialogo).getByText('Nueva medalla · Oro')).toBeInTheDocument();
    expect(within(dialogo).getByText('+250')).toBeInTheDocument();
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Ver la siguiente (1 más)' }));
    expect(await screen.findByRole('dialog', { name: 'Madrugador' })).toBeInTheDocument();
    expect(llamadasA(fetch, '/api/logros/vistas')).toHaveLength(0);
    await userEvent.click(screen.getByRole('button', { name: '¡Genial!' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(llamadasA(fetch, '/api/logros/vistas').map(([, o]) => o.method)).toEqual(['POST']);
  });

  test('si la API falla, permite reintentar', async () => {
    let falla = true;
    mostrar(() => (falla ? [500, { error: 'No pudimos cargar tus logros' }] : [200, logros()]));
    expect(await screen.findByText('No pudimos cargar tus logros')).toBeInTheDocument();
    falla = false;
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByText('Activo')).toBeInTheDocument();
  });
});

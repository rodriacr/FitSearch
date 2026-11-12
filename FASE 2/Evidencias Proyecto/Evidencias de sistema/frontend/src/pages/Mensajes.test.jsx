// Chat entre usuario y profesional (FS-HU-31; decisión del PO del 09-11-2026): uno por pareja con el historial de todas
// sus reservas, abierto aunque una se cancele, con buscador por palabras y eliminación con confirmación.
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test } from 'vitest';
import { llamadasA, renderizarApp, simularApi, SESION, SESION_PROFESIONAL } from '../tests/utilidades.jsx';
import { coincidencias, extracto, terminos } from '../components/mensajes/buscar.js';

const cita = { fecha: '2099-10-13', horaInicio: '09:00', horaFin: '09:45' };
const CAMILA = { nombre: 'Camila Rojas', detalle: 'Nutrición', profesionalId: 3 };
const CHATS = {
  chats: [
    { id: 5, con: CAMILA, noLeidos: 1, actividad: '2099-10-10T15:00:00.000Z', ultimaCita: { ...cita, estado: 'confirmada' },
      ultimo: { id: 2, texto: 'Te espero el martes', fecha: '2099-10-10T15:00:00.000Z', propio: false, leido: false } },
    { id: 6, con: { nombre: 'Diego Soto', detalle: 'Kinesiología', profesionalId: 4 }, noLeidos: 0, actividad: '2099-10-09T12:00:00.000Z',
      ultimaCita: { ...cita, estado: 'cancelada' }, ultimo: { id: 1, texto: 'No podré ir', fecha: '2099-10-09T12:00:00.000Z', propio: true, leido: true } },
  ],
};
const RESERVAS = [
  { id: 40, estado: 'cancelada', mensaje: 'Quiero una evaluación con exámenes', fecha: '2099-10-01T12:00:00.000Z',
    cita: { fecha: '2099-10-06', horaInicio: '10:00', horaFin: '10:45' } },
  { id: 41, estado: 'confirmada', mensaje: 'Reagendo la evaluación', fecha: '2099-10-08T12:00:00.000Z', cita },
];
const MENSAJES = [
  { id: 1, texto: 'Hola Camila, ¿llevo mis exámenes?', fecha: '2099-10-02T13:00:00.000Z', propio: true, leido: true },
  { id: 2, texto: 'Te espero el martes', fecha: '2099-10-10T15:00:00.000Z', propio: false, leido: true },
];
const abierto = (mensajes = MENSAJES, con = CAMILA) => ({ chat: { id: 5, con, reservas: RESERVAS }, mensajes });

// API simulada de un chat: lista, aviso de la campana, abrir, escribir y eliminar.
function simularChat({ lista = CHATS, mensajes = [...MENSAJES] } = {}) {
  let eliminado = false;
  return simularApi({
    '/api/chats/no-leidos': { total: 1 },
    '/api/chats': (_u, o) => (o.method === 'POST' ? [200, { id: 5 }] : [200, eliminado ? { chats: lista.chats.slice(1) } : lista]),
    '/api/chats/5': (url, o) => {
      if (url.endsWith('/mensajes')) {
        const nuevo = { id: 9, texto: JSON.parse(o.body).texto, fecha: '2099-10-11T16:00:00.000Z', propio: true, leido: false };
        mensajes.push(nuevo);
        return [201, { mensaje: nuevo }];
      }
      if (o.method === 'DELETE') { eliminado = true; return [200, { id: 5 }]; }
      return [200, abierto(mensajes)];
    },
  });
}

describe('buscador por palabras', () => {
  test('ignora mayúsculas y tildes, exige todas las palabras y marca cada aparición', () => {
    expect(terminos('  HOLA   Exámenes a ')).toEqual(['hola', 'examenes']);
    expect(coincidencias('Hola Camila, ¿llevo mis exámenes?', terminos('examenes hola'))).toEqual([[0, 4], [24, 32]]);
    expect(coincidencias('Hola Camila', terminos('hola martes'))).toBeNull();
    expect(coincidencias('Ñandú y ñandúes', terminos('nandu'))).toEqual([[0, 5], [8, 13]]);
    const corte = extracto(`${'palabra '.repeat(20)}objetivo final`, coincidencias(`${'palabra '.repeat(20)}objetivo final`, ['objetivo']));
    expect(corte.antes).toBe(true);
    expect(corte.partes.find((p) => p.marca).texto).toBe('objetivo');
  });
});

describe('usuario', () => {
  beforeEach(() => sessionStorage.setItem('fitsearch_sesion', JSON.stringify(SESION)));

  test('un chat por profesional con el historial de todas sus reservas; escribe aunque una esté cancelada', async () => {
    const fetch = simularChat();
    renderizarApp('/mensajes');
    const enlace = await screen.findByRole('link', { name: /Camila Rojas/ });
    expect(within(enlace).getByLabelText('1 sin leer')).toBeInTheDocument();
    // Junto al nombre va la especialidad del profesional (11-11-2026).
    expect(enlace).toHaveAccessibleName(/^Camila Rojas,\s*Nutrición/);
    expect(screen.getByRole('link', { name: /^Diego Soto,\s*Kinesiología/ })).toBeInTheDocument();
    expect(screen.getByText('Tú: No podré ir')).toBeInTheDocument();
    expect(screen.getByText('Elige un chat para leerlo y responder.')).toBeInTheDocument();

    await userEvent.click(enlace);
    const hilo = await screen.findByRole('list', { name: 'Mensajes' });
    expect(within(hilo).getByText('Quiero una evaluación con exámenes')).toBeInTheDocument();
    expect(within(hilo).getByText('Reagendo la evaluación')).toBeInTheDocument();
    expect(within(hilo).getByText('Cancelada')).toBeInTheDocument();
    expect(within(hilo).getAllByText(/Reservaste para el/)).toHaveLength(2);
    expect(screen.getByRole('heading', { level: 2, name: 'Camila Rojas' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Camila Rojas' })).toHaveAttribute('href', '/profesionales/3');
    expect(screen.getByText('Nutrición · Próxima cita: mar 13 oct, 09:00')).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText('Escribe un mensaje'), '¿Hay otra hora?{Enter}');
    expect(await within(hilo).findByText('¿Hay otra hora?')).toBeInTheDocument();
    expect(JSON.parse(llamadasA(fetch, '/api/chats/5/mensajes').find(([, o]) => o.method === 'POST')[1].body)).toEqual({ texto: '¿Hay otra hora?' });
    expect(screen.getByLabelText('Escribe un mensaje')).toHaveValue('');
  });

  test('busca palabras en el chat, lista los resultados y lleva al mensaje elegido', async () => {
    simularChat();
    renderizarApp('/mensajes/5');
    await screen.findByRole('list', { name: 'Mensajes' });
    await userEvent.click(screen.getByRole('button', { name: 'Buscar en el chat' }));
    const campo = screen.getByRole('searchbox', { name: 'Buscar palabras en el chat' });
    expect(campo).toHaveFocus();

    await userEvent.type(campo, 'EXAMENES');
    expect(screen.getByText('2 resultados')).toBeInTheDocument();
    const resultados = screen.getByRole('list', { name: 'Resultados de la búsqueda' });
    expect(within(resultados).getAllByText('exámenes', { selector: 'mark' })).toHaveLength(2);
    const [primero, segundo] = within(resultados).getAllByRole('button');
    expect(primero).toHaveTextContent('Tú');
    expect(segundo).toHaveTextContent('Mensaje de la reserva');

    await userEvent.click(primero);
    expect(screen.queryByRole('list', { name: 'Resultados de la búsqueda' })).not.toBeInTheDocument();
    const elegido = document.querySelector('.mensaje-chat--destacado');
    expect(elegido).toHaveTextContent('Hola Camila, ¿llevo mis exámenes?');
    expect(elegido).toHaveFocus();
    expect(within(elegido).getByText('exámenes', { selector: 'mark' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Resultados (2)' }));
    expect(screen.getByRole('list', { name: 'Resultados de la búsqueda' })).toBeInTheDocument();
    await userEvent.clear(campo);
    await userEvent.type(campo, 'hola martes');
    expect(screen.getByText('No encontramos «hola martes» en este chat.')).toBeInTheDocument();
    expect(screen.getByText('0 resultados')).toBeInTheDocument();

    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Buscar en el chat' })).toHaveFocus();
    expect(document.querySelector('.mensajes mark')).toBeNull();
  });

  test('eliminar pide confirmación: cancelar no borra y confirmar lo quita solo para quien lo pide', async () => {
    const fetch = simularChat();
    renderizarApp('/mensajes/5');
    await screen.findByRole('list', { name: 'Mensajes' });
    await userEvent.click(screen.getByRole('button', { name: 'Eliminar chat' }));
    const confirmacion = screen.getByRole('alertdialog', { name: '¿Eliminar este chat?' });
    expect(confirmacion).toHaveAccessibleDescription(/Se borra el historial solo para ti; Camila Rojas lo seguirá viendo/);
    expect(within(confirmacion).getByRole('button', { name: 'Cancelar' })).toHaveFocus();

    await userEvent.keyboard('{Enter}');
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(llamadasA(fetch, '/api/chats/5').some(([, o]) => o.method === 'DELETE')).toBe(false);

    await userEvent.click(screen.getByRole('button', { name: 'Eliminar chat' }));
    await userEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Eliminar chat' }));
    expect(await screen.findByText('Eliminaste el chat con Camila Rojas.')).toBeInTheDocument();
    expect(llamadasA(fetch, '/api/chats/5').filter(([, o]) => o.method === 'DELETE')).toHaveLength(1);
    expect(await screen.findByText('Elige un chat para leerlo y responder.')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Camila Rojas/ })).not.toBeInTheDocument();
  });

  test('desde una reserva abre el chat de esa pareja; una reserva ajena o un chat ajeno no existen', async () => {
    const fetch = simularApi({
      '/api/chats/no-leidos': { total: 0 },
      '/api/chats': (_u, o) => {
        if (o.method !== 'POST') return [200, CHATS];
        return JSON.parse(o.body).reservaId === 41 ? [200, { id: 5 }] : [404, { error: 'No encontramos esta conversación' }];
      },
      '/api/chats/5': abierto(),
      '/api/chats/9': () => [404, { error: 'No encontramos esta conversación' }],
    });
    renderizarApp('/mensajes?reserva=41');
    expect(await screen.findByRole('heading', { level: 2, name: 'Camila Rojas' })).toBeInTheDocument();
    expect(JSON.parse(llamadasA(fetch, '/api/chats').find(([, o]) => o.method === 'POST')[1].body)).toEqual({ reservaId: 41 });

    renderizarApp('/mensajes?reserva=77');
    expect(await screen.findByText('No encontramos el chat de esa reserva.')).toBeInTheDocument();
    renderizarApp('/mensajes/9');
    expect(await screen.findByText('No encontramos este chat.')).toBeInTheDocument();
  });

  test('la campana avisa los mensajes nuevos y lleva a Mensajes', async () => {
    simularApi({ '/api/chats/no-leidos': { total: 2 }, '/api/chats': CHATS, '/api/perfil': {}, '/api/profesionales': { profesionales: [] } });
    renderizarApp('/citas');
    const campana = await screen.findByRole('button', { name: 'Notificaciones: 2 mensajes sin leer' });
    await userEvent.click(campana);
    expect(screen.getByRole('link', { name: /2 mensajes nuevos/ })).toHaveAttribute('href', '/mensajes');
  });
});

test('el profesional ve el chat con el cliente en su espacio, con enlace a su ficha', async () => {
  sessionStorage.setItem('fitsearch_sesion', JSON.stringify(SESION_PROFESIONAL));
  const ana = { nombre: 'Ana Pérez', detalle: 'Cliente', clienteId: 4 };
  simularApi({
    '/api/chats/no-leidos': { total: 0 },
    '/api/chats': { chats: [{ ...CHATS.chats[0], con: ana }] },
    '/api/chats/5': abierto(MENSAJES.map((m) => ({ ...m, propio: !m.propio })), ana),
  });
  renderizarApp('/profesional/mensajes/5');
  expect(await screen.findByRole('link', { name: 'Ana Pérez' })).toHaveAttribute('href', '/profesional/clientes/4');
  expect(screen.getByText('Cliente · Próxima cita: mar 13 oct, 09:00')).toBeInTheDocument();
  // En la lista del profesional no se repite «Cliente» junto a cada nombre.
  expect(screen.getByRole('link', { name: /^Ana Pérez.*sin leer/ })).not.toHaveTextContent('Cliente');
  expect(within(screen.getByRole('list', { name: 'Mensajes' })).getAllByText(/Ana Pérez reservó para el/)).toHaveLength(2);
});

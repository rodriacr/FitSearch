import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { expect, test } from 'vitest';
import { SesionProvider } from '../../context/SesionContext.jsx';
import { SESION, simularApi } from '../../tests/utilidades.jsx';
import MensajesFlotantes from './MensajesFlotantes.jsx';

function preparar({ fallaEnvio = false } = {}) {
  sessionStorage.setItem('fitsearch_sesion', JSON.stringify(SESION));
  const mensajes = [];
  const con = { nombre: 'Camila Rojas', detalle: 'Nutrición', profesionalId: 3 };
  const fetch = simularApi({
    '/api/chats/no-leidos': { total: 1 },
    '/api/chats': { chats: [{ id: 5, con, noLeidos: 1, actividad: '2026-11-23T12:00:00Z', ultimo: null, ultimaCita: null }] },
    '/api/chats/5': (url, o) => {
      if (url.endsWith('/mensajes')) {
        if (fallaEnvio) return [500, { error: 'No se pudo enviar' }];
        mensajes.push({ id: 1, texto: JSON.parse(o.body).texto, fecha: '2026-11-23T12:00:00Z', propio: true, leido: false });
        return [201, { mensaje: mensajes[0] }];
      }
      return [200, { chat: { id: 5, con, reservas: [] }, mensajes: [...mensajes] }];
    },
  });
  render(<MemoryRouter><SesionProvider><MensajesFlotantes /></SesionProvider></MemoryRouter>);
  return fetch;
}
async function abrir() {
  await userEvent.click(screen.getByRole('button', { name: /^Mensajes/ }));
  await userEvent.click(await screen.findByRole('button', { name: /Camila Rojas/ }));
  return screen.findByRole('textbox', { name: 'Escribe un mensaje' });
}

test('conserva la conversación y el borrador al ampliar, achicar y minimizar', async () => {
  preparar();
  const texto = await abrir();
  await userEvent.type(texto, 'Hola, quiero confirmar mi hora');
  await userEvent.click(screen.getByRole('button', { name: 'Ampliar mensajes' }));
  expect(screen.getByRole('region', { name: 'Ventana de mensajes' }).closest('.mensajes-flotantes')).toHaveClass('mensajes-flotantes--ampliado');
  await userEvent.click(screen.getByRole('button', { name: 'Achicar mensajes' }));
  expect(texto).toHaveValue('Hola, quiero confirmar mi hora');
  await userEvent.click(screen.getByRole('button', { name: 'Cerrar ventana de mensajes' }));
  expect(screen.queryByRole('textbox', { name: 'Escribe un mensaje' })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: /^Mensajes/ })).toHaveFocus();
  await userEvent.click(screen.getByRole('button', { name: /^Mensajes/ }));
  expect(await screen.findByRole('textbox', { name: 'Escribe un mensaje' })).toHaveValue('Hola, quiero confirmar mi hora');
});

test('envía al mismo servicio de chats y actualiza el historial', async () => {
  const fetch = preparar();
  await userEvent.type(await abrir(), 'Hola, confirmo mi hora');
  await userEvent.click(screen.getByRole('button', { name: 'Enviar mensaje' }));
  expect(await screen.findByText('Hola, confirmo mi hora')).toBeInTheDocument();
  await waitFor(() => expect(screen.getByRole('textbox', { name: 'Escribe un mensaje' })).toHaveValue(''));
  expect(fetch.mock.calls.some(([url, o]) => url === '/api/chats/5/mensajes' && JSON.parse(o.body).texto === 'Hola, confirmo mi hora')).toBe(true);
});

test('un error de envío conserva el texto para reintentar', async () => {
  preparar({ fallaEnvio: true });
  const texto = await abrir();
  await userEvent.type(texto, 'No perder este mensaje');
  await userEvent.click(screen.getByRole('button', { name: 'Enviar mensaje' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo enviar');
  expect(texto).toHaveValue('No perder este mensaje');
  await userEvent.click(screen.getByRole('button', { name: 'Cerrar ventana de mensajes' }));
  await userEvent.click(screen.getByRole('button', { name: /^Mensajes/ }));
  expect(await screen.findByRole('textbox', { name: 'Escribe un mensaje' })).toHaveValue('No perder este mensaje');
});

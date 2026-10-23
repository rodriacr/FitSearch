// Asistente IA (FS-HU-07): bienvenida, historial con fijadas, conversar, errores, límite diario, fijar y borrar.
// Recomendación de profesional (FS-HU-08): tarjeta con la especialidad y acceso al buscador filtrado.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test } from 'vitest';
import { renderizarApp, SESION, simularApi } from '../tests/utilidades.jsx';

beforeEach(() => sessionStorage.setItem('fitsearch_sesion', JSON.stringify(SESION)));

const hoy = new Date().toISOString();
const mensajeDe = (id, remitente, contenido) => ({ id, remitente, contenido, fecha: hoy });

// Servidor simulado del asistente con estado: conversaciones, mensajes y respuestas configurables.
function simularAsistente({ restantesHoy = 28, fallaEnvio = null } = {}) {
  const servidor = {
    restantesHoy,
    conversaciones: [
      { id: 5, titulo: 'Plan de alimentación', fijada: false, fechaInicio: hoy, fechaActualizacion: hoy },
      { id: 6, titulo: 'Rutina de entrenamiento', fijada: true, fechaInicio: hoy, fechaActualizacion: hoy },
    ],
    mensajes: {
      5: [mensajeDe(1, 'usuario', '¿Qué desayuno?'), mensajeDe(2, 'asistente', 'Puedes combinar:\n- Avena\n- Fruta\n\nY tomar agua.')],
      6: [mensajeDe(3, 'usuario', 'Rutina'), mensajeDe(4, 'asistente', 'Empieza de a poco.')],
    },
    cuerpos: [],
  };
  const resumen = (c) => ({ ...c, vistaPrevia: servidor.mensajes[c.id]?.at(-1)?.contenido.slice(0, 40) ?? '' });
  const fetch = simularApi({
    '/api/asistente/estado': () => [200, { modo: 'simulado', limiteDiario: 30, restantesHoy: servidor.restantesHoy }],
    '/api/asistente/conversaciones': (url, { method = 'GET', body }) => {
      const cuerpo = body ? JSON.parse(body) : undefined;
      if (cuerpo) servidor.cuerpos.push({ url, method, cuerpo });
      const [, idTexto, extra] = url.match(/conversaciones\/?(\d+)?(\/mensajes)?/);
      const id = Number(idTexto);
      if (!idTexto && method === 'GET') return [200, { conversaciones: servidor.conversaciones.map(resumen) }];
      if (fallaEnvio && method === 'POST') return fallaEnvio;
      const respuesta = mensajeDe(100 + servidor.cuerpos.length, 'asistente', `Respuesta a «${cuerpo?.mensaje}»`);
      if (!idTexto && method === 'POST') {
        const nueva = { id: 9, titulo: cuerpo.mensaje, fijada: false, fechaInicio: hoy, fechaActualizacion: hoy };
        servidor.conversaciones.unshift(nueva);
        servidor.mensajes[9] = [mensajeDe(99, 'usuario', cuerpo.mensaje), respuesta];
        servidor.restantesHoy -= 1;
        return [201, { conversacion: nueva, mensajes: servidor.mensajes[9], restantesHoy: servidor.restantesHoy }];
      }
      const conversacion = servidor.conversaciones.find((c) => c.id === id);
      if (!conversacion) return [404, { error: 'No encontramos esta conversación' }];
      if (extra && method === 'POST') {
        const nuevos = [mensajeDe(200 + servidor.cuerpos.length, 'usuario', cuerpo.mensaje), respuesta];
        servidor.mensajes[id].push(...nuevos);
        servidor.restantesHoy -= 1;
        return [201, { mensajes: nuevos, restantesHoy: servidor.restantesHoy }];
      }
      if (method === 'PATCH') {
        conversacion.fijada = cuerpo.fijada;
        return [200, { conversacion }];
      }
      if (method === 'DELETE') {
        servidor.conversaciones = servidor.conversaciones.filter((c) => c.id !== id);
        return [204, null];
      }
      return [200, { conversacion, mensajes: servidor.mensajes[id] }];
    },
  });
  return { servidor, fetch };
}

const campo = () => screen.getByRole('textbox', { name: 'Escribe tu mensaje' });
const historial = () => screen.getByRole('complementary', { name: 'Tus conversaciones' });
const mensajes = () => screen.getByRole('log', { name: 'Mensajes de la conversación' });

describe('bienvenida e historial', () => {
  test('saluda por el nombre, avisa el modo de prueba y muestra acciones, sugerencias y el historial con las fijadas aparte', async () => {
    simularAsistente();
    renderizarApp('/asistente');
    expect(await screen.findByRole('heading', { level: 2, name: /¡Hola, Ana!/ })).toBeInTheDocument();
    expect(await screen.findByText(/Modo de prueba: las respuestas son de ejemplo/)).toBeInTheDocument();
    expect(within(mensajes()).getByText('Hola, Ana. ¿En qué puedo ayudarte hoy?')).toBeInTheDocument();
    for (const accion of ['Buscar profesionales adecuados', 'Resolver dudas de salud y deporte', 'Planificar tu alimentación y entrenamiento', 'Aprender a usar FitSearch']) {
      expect(screen.getByRole('button', { name: accion })).toBeInTheDocument();
    }
    const fijados = await within(historial()).findByRole('region', { name: 'Chats fijados' });
    expect(within(fijados).getByRole('link', { name: /Rutina de entrenamiento/ })).toHaveAttribute('href', '/asistente/6');
    const recientes = within(historial()).getByRole('region', { name: 'Chats recientes' });
    expect(within(recientes).getByRole('link', { name: /Plan de alimentación/ })).toHaveAttribute('href', '/asistente/5');
    expect(await screen.findByText('Te quedan 28 mensajes hoy')).toBeInTheDocument();
    expect(screen.getByText(/no reemplaza a un profesional de salud/)).toBeInTheDocument();
    // El SAMU (131) aparece solo en la respuesta ante una situación crítica, no fijo en la pantalla (SC-26).
    expect(screen.queryByText(/131/)).toBeNull();
  });

  test('una tarjeta de acción o una categoría completan el comienzo de la pregunta en el campo', async () => {
    simularAsistente();
    renderizarApp('/asistente');
    await userEvent.click(await screen.findByRole('button', { name: 'Planificar tu alimentación y entrenamiento' }));
    expect(campo()).toHaveValue('Ayúdame a organizar mi alimentación y entrenamiento para ');
    await waitFor(() => expect(campo()).toHaveFocus());
    await userEvent.click(screen.getByRole('button', { name: 'Suplementos' }));
    expect(campo()).toHaveValue('Tengo una duda sobre suplementos: ');
  });
});

describe('conversar', () => {
  test('una sugerencia rápida inicia una conversación, muestra la respuesta y la agrega al historial', async () => {
    const { servidor } = simularAsistente();
    renderizarApp('/asistente');
    await userEvent.click(await screen.findByRole('button', { name: '¿Qué comer después de entrenar?' }));
    expect(await within(mensajes()).findByText('Respuesta a «¿Qué comer después de entrenar?»')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: '¿Qué comer después de entrenar?' })).toBeInTheDocument();
    expect(servidor.cuerpos[0]).toMatchObject({ method: 'POST', cuerpo: { mensaje: '¿Qué comer después de entrenar?' } });
    expect(within(historial()).getByRole('link', { name: /¿Qué comer después de entrenar\?/ })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByText('Te quedan 27 mensajes hoy')).toBeInTheDocument();
  });

  test('en una conversación abierta, Enter envía y Shift+Enter hace un salto de línea', async () => {
    const { servidor } = simularAsistente();
    renderizarApp('/asistente/5');
    expect(await within(mensajes()).findByText('¿Qué desayuno?')).toBeInTheDocument();
    await userEvent.type(campo(), 'Hola{Shift>}{Enter}{/Shift}mundo');
    expect(campo()).toHaveValue('Hola\nmundo');
    expect(screen.getByText('10/1000')).toBeInTheDocument();
    await userEvent.keyboard('{Enter}');
    expect(await within(mensajes()).findByText('Respuesta a «Hola\nmundo»', { normalizer: (t) => t })).toBeInTheDocument();
    expect(servidor.cuerpos.at(-1)).toMatchObject({ url: '/api/asistente/conversaciones/5/mensajes', method: 'POST', cuerpo: { mensaje: 'Hola\nmundo' } });
    expect(campo()).toHaveValue('');
    expect(screen.getByRole('button', { name: 'Enviar mensaje' })).toBeDisabled();
  });

  test('las respuestas se muestran como texto: listas con «- » y nunca se interpreta HTML', async () => {
    const { servidor } = simularAsistente();
    servidor.mensajes[5].push(mensajeDe(7, 'asistente', '<img src="x" onerror="alert(1)">'));
    renderizarApp('/asistente/5');
    const lista = await within(mensajes()).findByRole('list');
    expect(within(lista).getAllByRole('listitem').map((li) => li.textContent)).toEqual(['Avena', 'Fruta']);
    expect(within(mensajes()).getByText('<img src="x" onerror="alert(1)">')).toBeInTheDocument();
    expect(document.querySelector('.chat-ia__mensajes img')).toBeNull();
  });

  test('si el asistente falla, el mensaje vuelve al campo para reintentar y se explica el error', async () => {
    simularAsistente({ fallaEnvio: [503, { error: 'El asistente no está disponible en este momento. Intenta nuevamente en unos minutos.' }] });
    renderizarApp('/asistente/5');
    await within(mensajes()).findByText('¿Qué desayuno?');
    await userEvent.type(campo(), '¿Y la cena?{Enter}');
    expect(await screen.findByText('El asistente no está disponible en este momento. Intenta nuevamente en unos minutos.')).toBeInTheDocument();
    expect(campo()).toHaveValue('¿Y la cena?');
  });

  test('al llegar al límite diario se avisa y el campo queda bloqueado', async () => {
    simularAsistente({ restantesHoy: 1, fallaEnvio: [429, { error: 'Llegaste al límite de 30 mensajes de hoy. Vuelve a conversar mañana.' }] });
    renderizarApp('/asistente/5');
    await within(mensajes()).findByText('¿Qué desayuno?');
    expect(await screen.findByText('Te queda 1 mensaje hoy')).toBeInTheDocument();
    await userEvent.type(campo(), 'Otra pregunta{Enter}');
    expect(await screen.findByText('Llegaste al límite de 30 mensajes de hoy. Vuelve a conversar mañana.')).toBeInTheDocument();
    expect(campo()).toBeDisabled();
    expect(screen.getByText('Llegaste al límite de mensajes de hoy. Vuelve mañana.')).toBeInTheDocument();
  });

  test('una conversación ajena o inexistente muestra el error con una salida', async () => {
    simularAsistente();
    renderizarApp('/asistente/77');
    expect(await screen.findByText('No encontramos esta conversación')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ir a tus conversaciones' })).toHaveAttribute('href', '/asistente');
  });
});

describe('recomendación de profesional (FS-HU-08)', () => {
  test('bajo la respuesta muestra la especialidad recomendada con un enlace al buscador filtrado', async () => {
    const { servidor } = simularAsistente();
    servidor.mensajes[5].push(mensajeDe(8, 'usuario', 'Me duele la rodilla al correr'),
      { ...mensajeDe(9, 'asistente', 'Te conviene que te evalúe un kinesiólogo.'), especialidad: 'Kinesiología' });
    renderizarApp('/asistente/5');
    expect(await within(mensajes()).findByText('Te conviene que te evalúe un kinesiólogo.')).toBeInTheDocument();
    expect(within(mensajes()).getByText('Kinesiología')).toBeInTheDocument();
    expect(within(mensajes()).getByRole('link', { name: /Ver kinesiólogos/ })).toHaveAttribute('href', '/profesionales?especialidad=Kinesiolog%C3%ADa');
    // Las respuestas sin recomendación no muestran la tarjeta.
    expect(within(mensajes()).getAllByText(/Te recomendamos consultar con/)).toHaveLength(1);
  });

  test('el banner «¿Necesitas una recomendación?» abre un chat nuevo con la pregunta, aunque el asistente ya esté abierto', async () => {
    simularAsistente();
    renderizarApp('/asistente');
    const banner = await screen.findByRole('link', { name: /Abrir chat/ });
    expect(banner).toHaveAttribute('href', '/asistente/nuevo?inicio=profesional');
    await userEvent.click(banner);
    await waitFor(() => expect(campo()).toHaveValue('¿Qué tipo de profesional me conviene consultar para '));
    await waitFor(() => expect(campo()).toHaveFocus());
  });

  test('con ?inicio=profesional el campo trae la pregunta y el cursor al final para terminarla', async () => {
    simularAsistente();
    renderizarApp('/asistente/nuevo?inicio=profesional');
    await waitFor(() => expect(campo()).toHaveValue('¿Qué tipo de profesional me conviene consultar para '));
    await waitFor(() => expect(campo()).toHaveFocus());
  });
});

describe('fijar y borrar', () => {
  test('fija una conversación (pasa a Chats fijados) y la borra después de confirmar', async () => {
    const { fetch } = simularAsistente();
    renderizarApp('/asistente/5');
    await within(mensajes()).findByText('¿Qué desayuno?');
    await userEvent.click(screen.getByRole('button', { name: 'Fijar conversación' }));
    expect(await screen.findByRole('button', { name: 'Desfijar conversación' })).toHaveAttribute('aria-pressed', 'true');
    const fijados = within(historial()).getByRole('region', { name: 'Chats fijados' });
    expect(within(fijados).getByRole('link', { name: /Plan de alimentación/ })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Borrar conversación' }));
    expect(screen.getByText('¿Borrar esta conversación? No podrás recuperarla.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Borrar' }));
    await waitFor(() => expect(within(historial()).queryByRole('link', { name: /Plan de alimentación/ })).not.toBeInTheDocument());
    // React Router aplica la navegación como transición: se espera a que vuelva la bienvenida.
    expect(await screen.findByRole('heading', { level: 2, name: /¡Hola, Ana!/ })).toBeInTheDocument();
    expect(fetch.mock.calls.some(([url, o]) => url === '/api/asistente/conversaciones/5' && o?.method === 'DELETE')).toBe(true);
  });
});

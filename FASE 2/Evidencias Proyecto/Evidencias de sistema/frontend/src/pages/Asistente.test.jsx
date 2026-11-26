// Asistente IA (FS-HU-07): bienvenida, historial con fijadas, conversar, errores, límite diario, fijar y borrar.
// Recomendación de profesional (FS-HU-08): tarjeta con la especialidad y, desde la SC-47, profesionales reales.
// SC-47: modalidad, reserva en el chat, «¿Cómo voy hoy?», valoración, permiso del perfil y respuesta en vivo.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test } from 'vitest';
import {
  fichaProfesional, listado, llamadasA, parametrosDe, renderizarApp, SESION, simularApi, simularUbicacion,
} from '../tests/utilidades.jsx';

beforeEach(() => sessionStorage.setItem('fitsearch_sesion', JSON.stringify(SESION)));

const hoy = new Date().toISOString();
const mensajeDe = (id, remitente, contenido) => ({ id, remitente, contenido, fecha: hoy });

// Servidor simulado del asistente con estado: conversaciones, mensajes y respuestas configurables.
function simularAsistente({ restantesHoy = 28, fallaEnvio = null, permisoPerfil = { valor: 'no', fecha: hoy }, rutas = {} } = {}) {
  const servidor = {
    restantesHoy,
    permisoPerfil,
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
    '/api/asistente/estado': () => [200, { modo: 'simulado', limiteDiario: 30, restantesHoy: servidor.restantesHoy, permisoPerfil: servidor.permisoPerfil }],
    // SC-47: valoración y elección de la tarjeta, y permiso del perfil.
    '/api/asistente/mensajes': (url, { body }) => {
      const id = Number(url.match(/mensajes\/(\d+)/)[1]);
      const mensaje = Object.values(servidor.mensajes).flat().find((m) => m.id === id);
      Object.assign(mensaje, JSON.parse(body));
      return [200, { mensaje }];
    },
    '/api/asistente/permiso-perfil': (url, { body }) => {
      servidor.permisoPerfil = { valor: JSON.parse(body).permiso, fecha: hoy };
      return [200, { permisoPerfil: servidor.permisoPerfil }];
    },
    ...rutas,
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

  test('una tarjeta de acción completa la pregunta y ya no aparecen las categorías', async () => {
    simularAsistente();
    renderizarApp('/asistente');
    await userEvent.click(await screen.findByRole('button', { name: 'Planificar tu alimentación y entrenamiento' }));
    expect(campo()).toHaveValue('Ayúdame a organizar mi alimentación y entrenamiento para ');
    await waitFor(() => expect(campo()).toHaveFocus());
    expect(screen.queryByRole('heading', { name: 'Categorías' })).not.toBeInTheDocument();
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
  test('bajo la respuesta muestra la especialidad recomendada, pregunta cómo atenderse y deja el buscador como respaldo', async () => {
    const { servidor } = simularAsistente();
    servidor.mensajes[5].push(mensajeDe(8, 'usuario', 'Me duele la rodilla al correr'),
      { ...mensajeDe(9, 'asistente', 'Te conviene que te evalúe un kinesiólogo.'), especialidad: 'Kinesiología' });
    renderizarApp('/asistente/5');
    expect(await within(mensajes()).findByText('Te conviene que te evalúe un kinesiólogo.')).toBeInTheDocument();
    const tarjeta = within(mensajes()).getByRole('region', { name: 'Recomendación: kinesiólogos' });
    expect(within(tarjeta).getByText('Kinesiología')).toBeInTheDocument();
    expect(within(tarjeta).getByRole('group', { name: '¿Cómo prefieres atenderte?' })).toBeInTheDocument();
    expect(within(tarjeta).getByRole('link', { name: /Ver todos en el buscador/ })).toHaveAttribute('href', '/profesionales?especialidad=Kinesiolog%C3%ADa');
    // Las respuestas sin recomendación no muestran la tarjeta.
    expect(within(mensajes()).getAllByText(/Te recomiendo consultar con/)).toHaveLength(1);
  });

  test('el menú ya no duplica el acceso al asistente con Pedir recomendación', async () => {
    simularAsistente();
    renderizarApp('/asistente');
    expect(screen.queryByRole('link', { name: 'Pedir recomendación' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Asistente IA' })).toHaveAttribute('href', '/asistente');
  });

  test('con ?inicio=profesional el campo trae la pregunta y el cursor al final para terminarla', async () => {
    simularAsistente();
    renderizarApp('/asistente/nuevo?inicio=profesional');
    await waitFor(() => expect(campo()).toHaveValue('¿Qué tipo de profesional me conviene consultar para '));
    await waitFor(() => expect(campo()).toHaveFocus());
  });
});

describe('agregar alimentos desde el chat (FS-HU-09)', () => {
  test('bajo la respuesta muestra los alimentos agregados con acceso a Comidas', async () => {
    const { servidor } = simularAsistente();
    servidor.mensajes[5].push(mensajeDe(8, 'usuario', 'Añade 100 g de pollo y 150 g de arroz a mi almuerzo'), {
      ...mensajeDe(9, 'asistente', 'Listo, agregué a tu almuerzo de hoy: 100 g de pechuga de pollo cocida (165 kcal) y 150 g de arroz blanco cocido (195 kcal).'),
      comidasAgregadas: [
        { id: 41, nombre: 'Pechuga de pollo cocida', gramos: 100, calorias: 165, momento: 'almuerzo' },
        { id: 42, nombre: 'Arroz blanco cocido', gramos: 150, calorias: 195, momento: 'almuerzo' },
      ],
    });
    renderizarApp('/asistente/5');
    const tarjeta = (await within(mensajes()).findByText('Agregado a tus comidas de hoy')).closest('.comidas-ia');
    expect(within(tarjeta).getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      '100 g de pechuga de pollo cocida · 165 kcal', '150 g de arroz blanco cocido · 195 kcal',
    ]);
    expect(within(tarjeta).getByRole('link', { name: /Ver mis comidas/ })).toHaveAttribute('href', '/comidas');
    expect(within(mensajes()).getAllByText('Agregado a tus comidas de hoy')).toHaveLength(1);
  });

  test('con ?inicio=comida (desde Comidas) el campo trae el comienzo del pedido', async () => {
    simularAsistente();
    renderizarApp('/asistente/nuevo?inicio=comida');
    await waitFor(() => expect(campo()).toHaveValue('Agrega a mis comidas de hoy '));
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

// SC-47: mejora del asistente de IA.
describe('profesionales recomendados (SC-47)', () => {
  const pro = (id, nombre, extra = {}) => fichaProfesional({
    id, nombre, especialidad: 'Kinesiología', modalidad: 'presencial', comuna: 'Ñuñoa', proximaHora: null, proximasHoras: [], ...extra,
  });
  const conRecomendacion = (servidor, extra = {}) => servidor.mensajes[5].push(mensajeDe(8, 'usuario', 'Me duele la rodilla al correr hace una semana'),
    { ...mensajeDe(9, 'asistente', 'Te conviene que te evalúe un kinesiólogo.'), especialidad: 'Kinesiología', ...extra });
  const tarjeta = () => within(mensajes()).findByRole('region', { name: 'Recomendación: kinesiólogos' });

  test('online: muestra los 3 mejor evaluados, marca la primera opción y recuerda la elección', async () => {
    const { servidor, fetch } = simularAsistente({ rutas: {
      '/api/profesionales': listado([pro(1, 'Camila Soto', { verificado: true, modalidad: 'online' }), pro(2, 'Pedro Muñoz', { modalidad: 'ambas' }), pro(3, 'Ana Reyes', { modalidad: 'online' })]),
    } });
    conRecomendacion(servidor);
    renderizarApp('/asistente/5');
    await userEvent.click(await within(await tarjeta()).findByRole('button', { name: /Online/ }));
    const lista = await within(await tarjeta()).findByRole('list', { name: 'kinesiólogos recomendados' });
    expect(within(lista).getAllByRole('listitem').filter((li) => li.classList.contains('profesional-ia'))).toHaveLength(3);
    expect(within(lista).getByText('Mi primera opción')).toBeInTheDocument();
    expect(within(lista).getByRole('link', { name: 'Camila Soto' })).toHaveAttribute('href', '/profesionales/1');
    expect(within(lista).getByText('Verificado')).toBeInTheDocument();
    const consulta = parametrosDe(llamadasA(fetch, '/api/profesionales?').at(-1)[0]);
    expect(consulta).toMatchObject({ especialidad: 'Kinesiología', modalidad: 'online', orden: 'calificacion', limite: '3' });
    expect(consulta).not.toHaveProperty('lat');
    await waitFor(() => expect(JSON.parse(llamadasA(fetch, '/api/asistente/mensajes/9').at(-1)[1].body)).toEqual({ modalidad: 'online', criterio: 'calificacion' }));
    // Online no ofrece «Más cerca».
    expect(within(await tarjeta()).queryByRole('button', { name: 'Más cerca' })).not.toBeInTheDocument();
    expect(within(await tarjeta()).getByRole('button', { name: 'Mejor evaluados' })).toHaveAttribute('aria-pressed', 'true');
  });

  test('presencial: pide la ubicación y, si no hay cercanos, lleva al buscador con el filtro u ofrece los online', async () => {
    const posicion = simularUbicacion();
    const { servidor, fetch } = simularAsistente({ rutas: { '/api/profesionales': listado([]) } });
    conRecomendacion(servidor);
    renderizarApp('/asistente/5');
    await userEvent.click(await within(await tarjeta()).findByRole('button', { name: /Presencial/ }));
    expect(await within(await tarjeta()).findByText('No encontré kinesiólogos presenciales a menos de 25 km de ti. En el buscador puedes ver todas las opciones que hay.')).toBeInTheDocument();
    expect(posicion).toHaveBeenCalled();
    const consulta = parametrosDe(llamadasA(fetch, '/api/profesionales?').at(-1)[0]);
    expect(consulta).toMatchObject({ modalidad: 'presencial', orden: 'cercania', distanciaKm: '25', lat: '-33.437', lng: '-70.65' });
    expect(within(await tarjeta()).getByRole('link', { name: /Ver opciones en el buscador/ }))
      .toHaveAttribute('href', '/profesionales?especialidad=Kinesiolog%C3%ADa&modalidad=presencial');
    await userEvent.click(within(await tarjeta()).getByRole('button', { name: 'Ver los que atienden online' }));
    await waitFor(() => expect(parametrosDe(llamadasA(fetch, '/api/profesionales?').at(-1)[0])).toMatchObject({ modalidad: 'online', orden: 'calificacion' }));
  });

  test('presencial sin permiso de ubicación: explica y ofrece el buscador o los mejor evaluados', async () => {
    simularUbicacion({ error: 1 });
    const { servidor, fetch } = simularAsistente({ rutas: { '/api/profesionales': listado([pro(4, 'Rosa Díaz')]) } });
    conRecomendacion(servidor, { modalidad: 'presencial', criterio: 'cercania' });
    renderizarApp('/asistente/5');
    // Ya dijo «cerca»: no pregunta la modalidad, pide la ubicación.
    await userEvent.click(await within(await tarjeta()).findByRole('button', { name: 'Usar mi ubicación' }));
    expect(await within(await tarjeta()).findByText(/Sin permiso para ver tu ubicación/)).toBeInTheDocument();
    expect(llamadasA(fetch, '/api/profesionales?')).toHaveLength(0);
    await userEvent.click(within(await tarjeta()).getByRole('button', { name: 'Ver los mejor evaluados' }));
    expect(await within(await tarjeta()).findByRole('link', { name: 'Rosa Díaz' })).toBeInTheDocument();
    expect(parametrosDe(llamadasA(fetch, '/api/profesionales?').at(-1)[0])).toMatchObject({ modalidad: 'presencial', orden: 'calificacion' });
  });

  test('si pidió verificados, no pregunta la modalidad que ya dijo y filtra solo verificados; «Con hora hoy» filtra por hoy', async () => {
    const { servidor, fetch } = simularAsistente({ rutas: { '/api/profesionales': listado([pro(5, 'Luis Pino', { verificado: true, modalidad: 'online' })]) } });
    conRecomendacion(servidor, { modalidad: 'online', criterio: 'verificados' });
    renderizarApp('/asistente/5');
    expect(await within(await tarjeta()).findByRole('link', { name: 'Luis Pino' })).toBeInTheDocument();
    expect(within(await tarjeta()).queryByRole('group', { name: '¿Cómo prefieres atenderte?' })).not.toBeInTheDocument();
    expect(parametrosDe(llamadasA(fetch, '/api/profesionales?').at(-1)[0])).toMatchObject({ modalidad: 'online', verificado: 'true' });
    await userEvent.click(within(await tarjeta()).getByRole('button', { name: 'Con hora hoy' }));
    await waitFor(() => expect(parametrosDe(llamadasA(fetch, '/api/profesionales?').at(-1)[0])).toMatchObject({ disponible: 'hoy' }));
  });

  test('reserva sin salir del chat: hora, mensaje sugerido con su pregunta, primera visita y confirmación', async () => {
    const horas = [{ id: 71, fecha: '2026-12-01', horaInicio: '10:00', horaFin: '10:45' }, { id: 72, fecha: '2026-12-01', horaInicio: '11:00', horaFin: '11:45' }];
    const reservas = [];
    const { servidor } = simularAsistente({ rutas: {
      '/api/profesionales': listado([pro(6, 'Camila Soto', { modalidad: 'ambas', proximaHora: { fecha: '2026-12-01', horaInicio: '10:00' }, proximasHoras: horas })]),
      '/api/reservas': (url, { method = 'GET', body }) => {
        if (method !== 'POST') return [200, { reservas: [] }];
        reservas.push(JSON.parse(body));
        return [201, { reserva: { id: 90, estado: 'pendiente' } }];
      },
    } });
    conRecomendacion(servidor, { modalidad: 'online', criterio: 'calificacion' });
    renderizarApp('/asistente/5');
    await userEvent.click(await within(await tarjeta()).findByRole('button', { name: /Reservar/ }));
    const formulario = within(await tarjeta()).getByRole('form', { name: 'Reservar con Camila Soto' });
    await userEvent.click(within(formulario).getByRole('button', { name: /a las 11:00/ }));
    expect(within(formulario).getByRole('textbox', { name: 'Cuéntale brevemente qué necesitas' })).toHaveValue('Me duele la rodilla al correr hace una semana');
    const confirmar = within(formulario).getByRole('button', { name: /Confirmar/ });
    expect(confirmar).toBeDisabled();
    await userEvent.click(within(formulario).getByRole('radio', { name: 'Sí' }));
    // Atiende de ambas formas: queda elegida la modalidad de la tarjeta (online).
    expect(within(formulario).getByRole('radio', { name: 'Online' })).toBeChecked();
    await userEvent.click(confirmar);
    expect(await within(await tarjeta()).findByText('Solicitud enviada')).toBeInTheDocument();
    expect(reservas).toEqual([{ disponibilidadId: 72, mensaje: 'Me duele la rodilla al correr hace una semana', primeraVisita: true, modalidad: 'online' }]);
    expect(within(await tarjeta()).getByRole('link', { name: /Ver en Mis citas/ })).toHaveAttribute('href', '/citas');
  });
});

describe('¿Cómo voy hoy?, valoración y seguimiento (SC-47)', () => {
  test('muestra el resumen del día con barras frente a la meta y acceso a Comidas', async () => {
    const { servidor } = simularAsistente();
    servidor.mensajes[5].push(mensajeDe(8, 'usuario', '¿Cómo voy hoy?'), {
      ...mensajeDe(9, 'asistente', 'Así vas hoy:'),
      resumenDia: { fecha: '2026-11-26', calorias: { consumo: 1250, meta: 1900 }, proteinasG: { consumo: 50, meta: 110 }, carbohidratosG: { consumo: 140, meta: 210 }, grasasG: { consumo: 40, meta: 60 }, aguaMl: { consumo: 750, meta: 2000 } },
    });
    renderizarApp('/asistente/5');
    const resumen = (await within(mensajes()).findByText('Tu día de hoy')).closest('.resumen-ia');
    expect(within(resumen).getByText('1.250 / 1.900 kcal')).toBeInTheDocument();
    expect(within(resumen).getByText('750 / 2.000 ml')).toBeInTheDocument();
    expect(within(resumen).getByRole('img', { name: '66 % de la meta' })).toBeInTheDocument();
    expect(within(resumen).getByRole('link', { name: /Ver mis comidas/ })).toHaveAttribute('href', '/comidas');
    // Sugerencia para seguir después del resumen.
    expect(screen.getByRole('button', { name: '¿Qué puedo comer para completar el día?' })).toBeInTheDocument();
  });

  test('«¿Te sirvió?» guarda útil, permite quitarlo y agradece', async () => {
    const { fetch } = simularAsistente();
    renderizarApp('/asistente/5');
    const respuesta = (await within(mensajes()).findByText('Y tomar agua.')).closest('.burbuja');
    const util = within(respuesta).getByRole('button', { name: 'Me sirvió' });
    await userEvent.click(util);
    await waitFor(() => expect(util).toHaveAttribute('aria-pressed', 'true'));
    expect(within(respuesta).getByText('¡Gracias por contarnos!')).toBeInTheDocument();
    expect(JSON.parse(llamadasA(fetch, '/api/asistente/mensajes/2').at(-1)[1].body)).toEqual({ valoracion: 1 });
    await userEvent.click(util);
    await waitFor(() => expect(util).toHaveAttribute('aria-pressed', 'false'));
    expect(JSON.parse(llamadasA(fetch, '/api/asistente/mensajes/2').at(-1)[1].body)).toEqual({ valoracion: null });
    // El saludo inicial no se valora.
    expect(within(mensajes()).getAllByRole('button', { name: 'Me sirvió' })).toHaveLength(1);
  });

  test('bajo la última respuesta sugiere cómo seguir y la sugerencia se envía', async () => {
    const { servidor } = simularAsistente();
    renderizarApp('/asistente/5');
    const seguir = await screen.findByRole('list', { name: 'Sugerencias para seguir' });
    expect(within(seguir).getAllByRole('button').map((b) => b.textContent)).toEqual(['¿Cómo voy hoy?', '¿Qué profesional me puede ayudar con esto?']);
    await userEvent.click(within(seguir).getByRole('button', { name: '¿Cómo voy hoy?' }));
    await waitFor(() => expect(servidor.cuerpos.at(-1)).toMatchObject({ method: 'POST', cuerpo: { mensaje: '¿Cómo voy hoy?' } }));
  });
});

describe('permiso para usar el perfil (SC-47)', () => {
  test('antes de empezar pregunta; «Sí» con salud guarda perfil_salud y bajo el campo se puede cambiar', async () => {
    const { fetch } = simularAsistente({ permisoPerfil: { valor: null, fecha: null } });
    renderizarApp('/asistente');
    const permiso = await within(mensajes()).findByRole('region', { name: 'Antes de empezar: ¿me das permiso para usar los datos de tu perfil?' });
    expect(within(permiso).getByText(/Nunca comparto tu nombre, tu correo ni tu teléfono/)).toBeInTheDocument();
    await userEvent.click(within(permiso).getByRole('checkbox', { name: /Incluir también mi información de salud/ }));
    await userEvent.click(within(permiso).getByRole('button', { name: 'Sí, usar mi perfil' }));
    await waitFor(() => expect(within(mensajes()).queryByRole('region', { name: /me das permiso/ })).not.toBeInTheDocument());
    expect(JSON.parse(llamadasA(fetch, '/api/asistente/permiso-perfil').at(-1)[1].body)).toEqual({ permiso: 'perfil_salud' });
    expect(screen.getByText('Personalizo mis respuestas con tu perfil y tu salud.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Cambiar' }));
    const cambiar = await within(mensajes()).findByRole('region', { name: '¿Uso los datos de tu perfil?' });
    await userEvent.click(within(cambiar).getByRole('button', { name: 'No usar mi perfil' }));
    await waitFor(() => expect(screen.getByText('No uso los datos de tu perfil.')).toBeInTheDocument());
    expect(JSON.parse(llamadasA(fetch, '/api/asistente/permiso-perfil').at(-1)[1].body)).toEqual({ permiso: 'no' });
  });

  test('«Ahora no» guarda que no y ya no vuelve a preguntar', async () => {
    simularAsistente({ permisoPerfil: { valor: null, fecha: null } });
    renderizarApp('/asistente');
    await userEvent.click(await screen.findByRole('button', { name: 'Ahora no' }));
    await waitFor(() => expect(screen.queryByRole('region', { name: /me das permiso/ })).not.toBeInTheDocument());
    expect(screen.getByText('No uso los datos de tu perfil.')).toBeInTheDocument();
  });
});

describe('respuesta en vivo (SC-47)', () => {
  test('el texto aparece mientras se escribe y al final queda la respuesta guardada', async () => {
    let soltar;
    const espera = new Promise((resolver) => { soltar = resolver; });
    const codificar = (nombre, datos) => new TextEncoder().encode(`event: ${nombre}\ndata: ${JSON.stringify(datos)}\n\n`);
    const final = { conversacion: { id: 9, titulo: 'Hola', fijada: false, fechaInicio: hoy, fechaActualizacion: hoy }, restantesHoy: 27,
      mensajes: [mensajeDe(99, 'usuario', 'Hola'), mensajeDe(100, 'asistente', 'Para empezar, camina 20 minutos.')] };
    simularAsistente({ rutas: {
      '/api/asistente/conversaciones': (url, { method = 'GET' }) => (method === 'GET' ? [200, { conversaciones: [] }] : [0, null]),
    } });
    const original = globalThis.fetch;
    globalThis.fetch = (url, opciones = {}) => {
      if (url === '/api/asistente/conversaciones' && opciones.method === 'POST') {
        expect(opciones.headers.Accept).toMatch(/text\/event-stream/);
        const cuerpo = new ReadableStream({
          async start(control) {
            control.enqueue(codificar('texto', { texto: 'Para empezar,' }));
            await espera;
            control.enqueue(codificar('texto', { texto: 'Para empezar, camina 20 minutos.' }));
            control.enqueue(codificar('fin', final));
            control.close();
          },
        });
        return Promise.resolve(new Response(cuerpo, { status: 200, headers: { 'Content-Type': 'text/event-stream' } }));
      }
      return original(url, opciones);
    };
    renderizarApp('/asistente/nuevo');
    await userEvent.type(await screen.findByRole('textbox', { name: 'Escribe tu mensaje' }), 'Hola{Enter}');
    expect(await within(mensajes()).findByText('Para empezar,')).toBeInTheDocument();
    expect(screen.queryByText('El asistente está escribiendo…')).not.toBeInTheDocument();
    soltar();
    expect(await within(mensajes()).findByText('Para empezar, camina 20 minutos.')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('heading', { level: 2, name: 'Hola' })).toBeInTheDocument());
    globalThis.fetch = original;
  });
});

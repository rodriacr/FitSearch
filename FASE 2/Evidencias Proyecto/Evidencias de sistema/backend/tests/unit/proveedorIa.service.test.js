// Proveedor de IA del asistente (FS-HU-07, DAS D33; recomendación FS-HU-08, D34): cliente genérico compatible con
// OpenAI, con fetch simulado. Las especialidades activas llegan del catálogo (FS-HU-30).
const { ia } = require('../../src/config/env');
const proveedor = require('../../src/services/proveedorIa.service');
const { fechaEnChile } = require('../../src/services/asistente.service');

const respuestaJson = (estado, cuerpo) => ({ ok: estado >= 200 && estado < 300, status: estado, json: async () => cuerpo });
const conTexto = (texto) => respuestaJson(200, { choices: [{ message: { role: 'assistant', content: texto } }] });
const CATALOGO = ['Entrenamiento personal', 'Kinesiología', 'Medicina deportiva', 'Nutrición', 'Psicología deportiva'];

afterEach(() => {
  ia.apiKey = '';
  jest.restoreAllMocks();
});

describe('modo simulado (sin IA_API_KEY)', () => {
  test('responde un texto de ejemplo sin llamar al proveedor', async () => {
    const fetch = jest.spyOn(globalThis, 'fetch');
    expect(proveedor.modo()).toBe('simulado');
    const { contenido, especialidad } = await proveedor.responder([{ remitente: 'usuario', contenido: '¿Cómo empiezo a trotar?' }]);
    expect(contenido).toMatch(/^Modo de prueba/);
    expect(contenido).toContain('«¿Cómo empiezo a trotar?»');
    expect(especialidad).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  test('recomienda una especialidad del catálogo con palabras clave, para probar la tarjeta sin proveedor', async () => {
    const respuesta = (texto, catalogo = CATALOGO) => proveedor.responder([{ remitente: 'usuario', contenido: texto }], catalogo);
    expect((await respuesta('Me duele la rodilla al correr')).especialidad).toBe('Kinesiología');
    expect((await respuesta('¿Qué comer después de entrenar?')).especialidad).toBe('Nutrición');
    expect((await respuesta('Me siento desmotivado')).especialidad).toBe('Psicología deportiva');
    // Una especialidad desactivada por el administrador ya no se recomienda.
    expect((await respuesta('Me duele la rodilla al correr', ['Nutrición'])).especialidad).toBeNull();
  });
});

describe('con proveedor configurado', () => {
  beforeEach(() => { ia.apiKey = 'clave-de-prueba'; });

  test('envía las instrucciones y la conversación al endpoint compatible con OpenAI y limpia la respuesta', async () => {
    const fetch = jest.spyOn(globalThis, 'fetch').mockResolvedValue(conTexto('<think>razono</think>## Consejo\n**Hidrátate** bien.\n* Agua\n* Fruta'));
    const { contenido, especialidad } = await proveedor.responder([
      { remitente: 'usuario', contenido: 'Hola' },
      { remitente: 'asistente', contenido: '¡Hola! ¿En qué te ayudo?' },
      { remitente: 'usuario', contenido: '¿Qué tomo al entrenar?' },
    ], CATALOGO);
    expect(contenido).toBe('Consejo\nHidrátate bien.\n- Agua\n- Fruta');
    expect(especialidad).toBeNull();
    const [url, opciones] = fetch.mock.calls[0];
    expect(url).toBe('https://api.groq.com/openai/v1/chat/completions');
    expect(opciones.headers.Authorization).toBe('Bearer clave-de-prueba');
    const cuerpo = JSON.parse(opciones.body);
    expect(cuerpo.model).toBe(ia.modelo);
    expect(cuerpo.messages.map((m) => m.role)).toEqual(['system', 'user', 'assistant', 'user']);
    expect(cuerpo.messages[0].content).toBe(proveedor.instrucciones(CATALOGO));
    expect(cuerpo.messages[3].content).toBe('¿Qué tomo al entrenar?');
  });

  test('las instrucciones nombran las especialidades activas y la marca final; sin catálogo no piden la marca', () => {
    for (const nombre of CATALOGO) expect(proveedor.instrucciones(CATALOGO)).toContain(nombre);
    expect(proveedor.instrucciones(CATALOGO)).toContain('ESPECIALIDAD: <nombre>');
    expect(proveedor.instrucciones(['Nutrición'])).not.toContain('Kinesiología');
    expect(proveedor.instrucciones([])).not.toContain('ESPECIALIDAD: <nombre>');
  });

  test.each([
    ['marca exacta', 'Te conviene un kinesiólogo.\nESPECIALIDAD: Kinesiología', 'Kinesiología'],
    ['sin tildes, en minúsculas y con punto', 'Busca un nutricionista.\n\nespecialidad: nutricion.', 'Nutrición'],
    ['especialidad fuera del catálogo', 'Ve al dentista.\nESPECIALIDAD: Odontología', null],
    ['al final de la última frase (visto con Groq real)', 'Habla con alguien que te acompañe. ESPECIALIDAD: Psicología deportiva', 'Psicología deportiva'],
    ['la palabra especialidad dentro de una frase normal no es marca', 'En el buscador elige la especialidad: Nutrición y tu comuna.', null],
    ['sin marca', 'Toma agua durante el día.', null],
  ])('recomendación (%s): valida contra el catálogo y quita la marca del texto', async (_, texto, esperada) => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(conTexto(texto));
    const { contenido, especialidad } = await proveedor.responder([{ remitente: 'usuario', contenido: 'Hola' }], CATALOGO);
    expect(especialidad).toBe(esperada);
    expect(contenido).not.toMatch(/ESPECIALIDAD\s*:/);
    expect(contenido.length).toBeGreaterThan(0);
  });

  test('si la respuesta solo trae la marca, responde 503', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(conTexto('ESPECIALIDAD: Nutrición'));
    await expect(proveedor.responder([{ remitente: 'usuario', contenido: 'Hola' }])).rejects.toMatchObject({ estado: 503 });
  });

  test.each([
    ['muchas consultas (429)', () => Promise.resolve(respuestaJson(429, {})), /muchas consultas/],
    ['error del proveedor (500)', () => Promise.resolve(respuestaJson(500, {})), /no está disponible/],
    ['sin conexión o plazo vencido', () => Promise.reject(new Error('timeout')), /no está disponible/],
    ['respuesta sin texto', () => Promise.resolve(respuestaJson(200, { choices: [] })), /no está disponible/],
  ])('%s: responde 503 con un mensaje claro', async (_, falla, mensaje) => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(globalThis, 'fetch').mockImplementation(falla);
    await expect(proveedor.responder([{ remitente: 'usuario', contenido: 'Hola' }])).rejects.toMatchObject({ estado: 503, message: expect.stringMatching(mensaje) });
  });
});

// FS-HU-09: el modelo puede pedir agregar alimentos con la función agregar_alimentos; el backend valida y registra.
describe('agregar alimentos (FS-HU-09)', () => {
  const conLlamada = (argumentos, contenido = null) => respuestaJson(200, { choices: [{ message: {
    role: 'assistant', content: contenido, tool_calls: [{ id: 'c1', type: 'function', function: { name: 'agregar_alimentos', arguments: argumentos } }],
  } }] });

  test('ofrece la función al proveedor y devuelve el pedido del modelo', async () => {
    ia.apiKey = 'clave-de-prueba';
    const fetch = jest.spyOn(globalThis, 'fetch').mockResolvedValue(conLlamada(JSON.stringify({ alimentos: [{ nombre: 'pechuga de pollo', gramos: 100 }], momento: 'cena' })));
    const respuesta = await proveedor.responder([{ remitente: 'usuario', contenido: 'Añade 100 g de pollo a mi cena' }]);
    expect(respuesta).toEqual({ pedido: { alimentos: [{ nombre: 'pechuga de pollo', gramos: 100 }], momento: 'cena' } });
    const cuerpo = JSON.parse(fetch.mock.calls[0][1].body);
    expect(cuerpo.tool_choice).toBe('auto');
    expect(cuerpo.tools[0].function.name).toBe('agregar_alimentos');
    expect(cuerpo.tools[0].function.parameters.properties.momento.enum).toEqual(['desayuno', 'media_manana', 'almuerzo', 'merienda', 'cena']);
    expect(proveedor.instrucciones(CATALOGO)).toContain('agregar_alimentos');
  });

  test('un momento fuera del catálogo se ignora; argumentos mal formados caen en el texto o responden 503', async () => {
    ia.apiKey = 'clave-de-prueba';
    const fetch = jest.spyOn(globalThis, 'fetch');
    fetch.mockResolvedValueOnce(conLlamada(JSON.stringify({ alimentos: [{ nombre: 'arroz', gramos: 150 }], momento: 'brunch' })));
    expect((await proveedor.responder([{ remitente: 'usuario', contenido: 'agrega arroz' }])).pedido.momento).toBeNull();
    fetch.mockResolvedValueOnce(conLlamada('{no es json', '¿Cuántos gramos de arroz comiste?'));
    expect(await proveedor.responder([{ remitente: 'usuario', contenido: 'agrega arroz' }])).toEqual({ contenido: '¿Cuántos gramos de arroz comiste?', especialidad: null });
    fetch.mockResolvedValueOnce(conLlamada(JSON.stringify({ alimentos: [] })));
    await expect(proveedor.responder([{ remitente: 'usuario', contenido: 'agrega' }])).rejects.toMatchObject({ estado: 503 });
  });

  test('en modo de prueba reconoce «N g de alimento» y el momento del día', async () => {
    const pedido = async (texto) => (await proveedor.responder([{ remitente: 'usuario', contenido: texto }])).pedido;
    expect(await pedido('Añádeme 100 g de pollo y 150g de arroz al almuerzo')).toEqual({
      alimentos: [{ nombre: 'pollo', gramos: 100 }, { nombre: 'arroz', gramos: 150 }], momento: 'almuerzo',
    });
    expect(await pedido('anota 120,5 gramos de plátano a mi media mañana')).toEqual({ alimentos: [{ nombre: 'platano', gramos: 120.5 }], momento: 'media_manana' });
    expect(await pedido('registra 30 g de almendras')).toEqual({ alimentos: [{ nombre: 'almendras', gramos: 30 }], momento: null });
    expect(await pedido('agrega pollo a mis comidas')).toBeUndefined();
    expect(await pedido('¿100 g de pollo tienen mucha proteína?')).toBeUndefined();
  });
});

describe('red de seguridad', () => {
  test('ante señales de riesgo agrega a quién llamar, aunque el modelo no lo diga', () => {
    expect(proveedor.agregarAvisos('Ya no quiero vivir', 'Lamento que te sientas así.')).toContain('*4141');
    expect(proveedor.agregarAvisos('Tengo dolor en el pecho y me cuesta respirar', 'Descansa.')).toContain('SAMU (131)');
    expect(proveedor.agregarAvisos('¿Qué como antes de entrenar?', 'Una fruta.')).toBe('Una fruta.');
  });

  // Decisión del PO (22-10-2026, SC-26): el SAMU solo ante situaciones críticas, no en molestias leves.
  test.each([
    'Me rompí la pierna jugando a la pelota', 'Se me quebró el brazo', 'Me caí y tengo el hueso expuesto',
    'Mi amigo se desmayó corriendo y no reacciona', 'Me desmayé en el gimnasio', 'Tengo convulsiones',
    'Tengo un dolor fuerte en el pecho', 'Tengo dolor en el pecho al correr', 'Siento el dolor del pecho que se me va al brazo',
    'No puedo respirar', 'Se me está hinchando la garganta', 'Me corté y sangra mucho',
  ])('situación crítica, agrega el SAMU (131): %s', (texto) => {
    expect(proveedor.agregarAvisos(texto, 'Ok.')).toContain('SAMU (131)');
  });

  test.each([
    'Me duele un poco la rodilla cuando corro', 'Tengo agujetas después del gimnasio',
    'Me torcí el tobillo y está un poco hinchado', 'Me duele el pecho después del press de banca, como un dolor muscular',
    'Casi me desmayo de cansancio en spinning', 'Me mareo un poco si entreno sin desayunar',
  ])('molestia leve, no agrega el 131: %s', (texto) => {
    expect(proveedor.agregarAvisos(texto, 'Ok.')).toBe('Ok.');
  });

  test('reconoce las formas directas de expresar riesgo suicida y agrega el *4141', () => {
    for (const texto of ['Me quiero matar', 'me voy a matar', 'Quiero morir', 'tengo ganas de morir', 'quiero acabar con mi vida',
      'Voy a terminar con mi vida']) {
      expect(proveedor.agregarAvisos(texto, 'Ok.')).toContain('*4141');
    }
    expect(proveedor.agregarAvisos('Me muero de hambre después de entrenar', 'Come algo.')).toBe('Come algo.');
  });

  test('no repite el aviso si la respuesta ya incluye el número', () => {
    const respuesta = 'Llama al SAMU (131) ahora.';
    expect(proveedor.agregarAvisos('me desmayé', respuesta)).toBe(respuesta);
  });
});

test('el límite diario usa el día de Chile, no el de UTC', () => {
  // Octubre: Chile está en UTC-3. 03:30 UTC son las 00:30 en Santiago (ya es el 21).
  expect(fechaEnChile(new Date('2026-10-21T03:30:00Z'))).toBe('2026-10-21');
  // 02:30 UTC son las 23:30 del 20 en Santiago.
  expect(fechaEnChile(new Date('2026-10-21T02:30:00Z'))).toBe('2026-10-20');
});

// SC-47: mejora del asistente de IA.
describe('recomendación de profesionales reales (SC-47)', () => {
  test('las instrucciones dicen que FitSearch muestra profesionales reales y prohíben inventarlos o mandar al buscador', () => {
    const texto = proveedor.instrucciones(CATALOGO);
    expect(texto).toMatch(/profesionales reales/);
    expect(texto).toMatch(/Nunca inventes ni nombres profesionales/);
    expect(texto).toMatch(/No expliques cómo buscar, filtrar ni usar el buscador/);
    expect(proveedor.instrucciones([])).not.toMatch(/profesionales reales/);
  });
});

describe('¿Cómo voy hoy? (SC-47)', () => {
  const conResumen = (contenido = null) => respuestaJson(200, { choices: [{ message: {
    role: 'assistant', content: contenido, tool_calls: [{ id: 'c2', type: 'function', function: { name: 'resumen_del_dia', arguments: '{}' } }],
  } }] });

  test('ofrece la función resumen_del_dia y devuelve { resumen: true } cuando el modelo la usa', async () => {
    ia.apiKey = 'clave-de-prueba';
    const fetch = jest.spyOn(globalThis, 'fetch').mockResolvedValue(conResumen());
    expect(await proveedor.responder([{ remitente: 'usuario', contenido: '¿Cómo voy hoy?' }], CATALOGO)).toEqual({ resumen: true });
    const cuerpo = JSON.parse(fetch.mock.calls[0][1].body);
    expect(cuerpo.tools.map((h) => h.function.name)).toEqual(['agregar_alimentos', 'resumen_del_dia']);
    expect(proveedor.instrucciones(CATALOGO)).toContain('resumen_del_dia');
  });

  test('en modo de prueba reconoce las preguntas por el día, sin confundirlas con otras', async () => {
    const pide = async (texto) => Boolean((await proveedor.responder([{ remitente: 'usuario', contenido: texto }], CATALOGO)).resumen);
    expect(await pide('¿Cómo voy hoy?')).toBe(true);
    expect(await pide('¿Cuánta proteína me falta?')).toBe(true);
    expect(await pide('¿cuántas calorías llevo?')).toBe(true);
    expect(await pide('Dame un resumen del día')).toBe(true);
    expect(await pide('¿Qué comer después de entrenar?')).toBe(false);
    expect(await pide('Me duele la rodilla')).toBe(false);
  });
});

describe('respuesta en vivo (SC-47)', () => {
  // Respuesta del proveedor por partes, como eventos «data:» de la API compatible con OpenAI.
  const enPartes = (eventos) => {
    const codificador = new TextEncoder();
    const texto = `${eventos.map((e) => `data: ${typeof e === 'string' ? e : JSON.stringify(e)}\n\n`).join('')}`;
    // Se corta en trozos de 7 bytes para probar que una línea puede llegar partida.
    const trozos = [];
    const bytes = codificador.encode(texto);
    for (let i = 0; i < bytes.length; i += 7) trozos.push(bytes.slice(i, i + 7));
    return {
      ok: true,
      status: 200,
      body: new ReadableStream({ start(control) { trozos.forEach((t) => control.enqueue(t)); control.close(); } }),
    };
  };
  const delta = (contenido) => ({ choices: [{ delta: { content: contenido } }] });

  test('entrega el texto visible a medida que llega y al final quita la marca y valida la especialidad', async () => {
    ia.apiKey = 'clave-de-prueba';
    const fetch = jest.spyOn(globalThis, 'fetch').mockResolvedValue(enPartes([
      delta('Para la rodilla te conviene **un kinesiólogo**.'), delta('\nESPECIAL'), delta('IDAD: Kinesiología'), '[DONE]',
    ]));
    const partes = [];
    const resultado = await proveedor.responderEnVivo([{ remitente: 'usuario', contenido: 'Me duele la rodilla' }], CATALOGO, (t) => partes.push(t));
    expect(JSON.parse(fetch.mock.calls[0][1].body).stream).toBe(true);
    expect(resultado).toEqual({ contenido: 'Para la rodilla te conviene un kinesiólogo.', especialidad: 'Kinesiología' });
    expect(partes.length).toBeGreaterThan(0);
    // Ninguna parte mostró la marca ni el formato.
    for (const parte of partes) expect(parte).not.toMatch(/ESPECIAL|\*\*/);
    expect(partes.at(-1)).toBe('Para la rodilla te conviene un kinesiólogo.');
  });

  test('junta las llamadas a funciones que llegan por partes', async () => {
    ia.apiKey = 'clave-de-prueba';
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(enPartes([
      { choices: [{ delta: { tool_calls: [{ index: 0, function: { name: 'agregar_alimentos', arguments: '{"alimentos":[{"nombre":"arroz",' } }] } }] },
      { choices: [{ delta: { tool_calls: [{ index: 0, function: { arguments: '"gramos":150}],"momento":"almuerzo"}' } }] } }] },
      '[DONE]',
    ]));
    const resultado = await proveedor.responderEnVivo([{ remitente: 'usuario', contenido: 'agrega 150 g de arroz al almuerzo' }], CATALOGO);
    expect(resultado).toEqual({ pedido: { alimentos: [{ nombre: 'arroz', gramos: 150 }], momento: 'almuerzo' } });
  });

  test('un corte del proveedor o una respuesta vacía responden 503', async () => {
    ia.apiKey = 'clave-de-prueba';
    jest.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true, status: 200, body: new ReadableStream({ start(control) { control.error(new Error('corte')); } }),
    });
    await expect(proveedor.responderEnVivo([{ remitente: 'usuario', contenido: 'Hola' }], CATALOGO)).rejects.toMatchObject({ estado: 503 });
    jest.spyOn(globalThis, 'fetch').mockResolvedValueOnce(enPartes(['[DONE]']));
    await expect(proveedor.responderEnVivo([{ remitente: 'usuario', contenido: 'Hola' }], CATALOGO)).rejects.toMatchObject({ estado: 503 });
  });

  test('en modo de prueba la respuesta simulada también llega por partes', async () => {
    const partes = [];
    const { contenido } = await proveedor.responderEnVivo([{ remitente: 'usuario', contenido: '¿Cómo empiezo a trotar?' }], CATALOGO, (t) => partes.push(t));
    expect(partes.length).toBeGreaterThan(2);
    expect(partes.at(-1)).toBe(contenido.trim());
  });

  test.each([
    ['Te recomiendo un kinesiólogo.\nESPEC', 'Te recomiendo un kinesiólogo.'],
    ['Te recomiendo un kinesiólogo. ESPECIALIDAD: Kinesio', 'Te recomiendo un kinesiólogo.'],
    ['Te recomiendo un kinesiólogo. ESPE', 'Te recomiendo un kinesiólogo.'],
    ['Hola **bien', 'Hola bien'],
    ['Empieza suave.\n- Camina\n- Tro', 'Empieza suave.\n- Camina\n- Tro'],
    // Una palabra en mayúsculas que no es la marca se muestra igual.
    ['Usa el IMC', 'Usa el IMC'],
  ])('lo visible de «%s» es «%s»', (parcial, visible) => {
    expect(proveedor.visibleParcial(parcial)).toBe(visible);
  });
});

// Proveedor de IA del asistente (FS-HU-07, DAS D33): cliente genérico compatible con OpenAI, con fetch simulado.
const { ia } = require('../../src/config/env');
const proveedor = require('../../src/services/proveedorIa.service');
const { fechaEnChile } = require('../../src/services/asistente.service');

const respuestaJson = (estado, cuerpo) => ({ ok: estado >= 200 && estado < 300, status: estado, json: async () => cuerpo });
const conTexto = (texto) => respuestaJson(200, { choices: [{ message: { role: 'assistant', content: texto } }] });

afterEach(() => {
  ia.apiKey = '';
  jest.restoreAllMocks();
});

describe('modo simulado (sin IA_API_KEY)', () => {
  test('responde un texto de ejemplo sin llamar al proveedor', async () => {
    const fetch = jest.spyOn(globalThis, 'fetch');
    expect(proveedor.modo()).toBe('simulado');
    const texto = await proveedor.responder([{ remitente: 'usuario', contenido: '¿Cómo empiezo a trotar?' }]);
    expect(texto).toMatch(/^Modo de prueba/);
    expect(texto).toContain('«¿Cómo empiezo a trotar?»');
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe('con proveedor configurado', () => {
  beforeEach(() => { ia.apiKey = 'clave-de-prueba'; });

  test('envía las instrucciones y la conversación al endpoint compatible con OpenAI y limpia la respuesta', async () => {
    const fetch = jest.spyOn(globalThis, 'fetch').mockResolvedValue(conTexto('<think>razono</think>## Consejo\n**Hidrátate** bien.\n* Agua\n* Fruta'));
    const texto = await proveedor.responder([
      { remitente: 'usuario', contenido: 'Hola' },
      { remitente: 'asistente', contenido: '¡Hola! ¿En qué te ayudo?' },
      { remitente: 'usuario', contenido: '¿Qué tomo al entrenar?' },
    ]);
    expect(texto).toBe('Consejo\nHidrátate bien.\n- Agua\n- Fruta');
    const [url, opciones] = fetch.mock.calls[0];
    expect(url).toBe('https://api.groq.com/openai/v1/chat/completions');
    expect(opciones.headers.Authorization).toBe('Bearer clave-de-prueba');
    const cuerpo = JSON.parse(opciones.body);
    expect(cuerpo.model).toBe(ia.modelo);
    expect(cuerpo.messages.map((m) => m.role)).toEqual(['system', 'user', 'assistant', 'user']);
    expect(cuerpo.messages[0].content).toBe(proveedor.INSTRUCCIONES);
    expect(cuerpo.messages[3].content).toBe('¿Qué tomo al entrenar?');
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

describe('red de seguridad', () => {
  test('ante señales de riesgo agrega a quién llamar, aunque el modelo no lo diga', () => {
    expect(proveedor.agregarAvisos('Ya no quiero vivir', 'Lamento que te sientas así.')).toContain('*4141');
    expect(proveedor.agregarAvisos('Tengo dolor en el pecho y me cuesta respirar', 'Descansa.')).toContain('SAMU (131)');
    expect(proveedor.agregarAvisos('¿Qué como antes de entrenar?', 'Una fruta.')).toBe('Una fruta.');
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

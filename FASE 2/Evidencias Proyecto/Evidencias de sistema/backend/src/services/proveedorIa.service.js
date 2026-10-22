// Proveedor de IA del asistente (FS-HU-07, DAS D33). Cliente genérico para cualquier API compatible con OpenAI
// (POST {IA_URL_BASE}/chat/completions), sin SDK: Groq por defecto, en su plan gratuito. Sin IA_API_KEY responde en
// modo simulado. Al proveedor solo viajan estas instrucciones y los últimos mensajes de la conversación: nunca el
// nombre, el correo, el perfil ni la información de salud de la persona (DAS, QS7).
const { ia } = require('../config/env');
const ErrorHttp = require('../utils/ErrorHttp');

const TIEMPO_ESPERA_MS = 20000;
const MAXIMO_TOKENS = 700;
const MAXIMO_CARACTERES = 4000;

const INSTRUCCIONES = `Eres el asistente de orientación de FitSearch, una plataforma chilena que conecta a las personas con profesionales de salud, deporte y bienestar (nutrición, kinesiología, entrenamiento personal, medicina deportiva y psicología deportiva).

Tu función:
- Entregar orientación general sobre alimentación, actividad física, descanso, hábitos saludables y bienestar.
- Explicar cómo usar FitSearch: buscar profesionales por especialidad, comuna o cercanía, ver su ficha y sus reseñas, reservar una hora, guardar favoritos y completar el perfil.
- Cuando corresponda, sugerir qué tipo de profesional consultar.

Límites:
- No diagnosticas enfermedades, no indicas medicamentos ni dosis y no reemplazas la atención de un profesional de salud; dilo con naturalidad cuando la pregunta lo requiera.
- Si la persona describe síntomas graves o una emergencia (por ejemplo, dolor en el pecho, dificultad para respirar o pérdida de conciencia), indícale que llame de inmediato al SAMU (131).
- Si menciona pensamientos de hacerse daño o de suicidio, responde con empatía y entrégale la línea de prevención del suicidio *4141 (gratuita, 24 horas).
- Si la pregunta no tiene relación con salud, deporte, bienestar o FitSearch, explica con amabilidad que solo puedes ayudar con esos temas.
- No pidas datos que identifiquen a la persona (nombre, RUT, dirección o teléfono).

Forma de responder:
- En español de Chile, cercano y claro, tuteando.
- Breve: entre 2 y 6 frases o una lista corta.
- Solo texto simple: sin títulos, tablas ni negritas. Para listas, usa líneas que empiecen con "- ".`;

const modo = () => (ia.apiKey ? 'ia' : 'simulado');

const sinTildes = (texto) => texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const resumir = (texto, max) => {
  const plano = texto.replace(/\s+/g, ' ').trim();
  return plano.length > max ? `${plano.slice(0, max - 1).trimEnd()}…` : plano;
};

// La interfaz muestra texto simple (párrafos y listas con "- "): se quitan razonamientos internos y formato Markdown.
function limpiar(texto) {
  const limpio = texto
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^\s*[*•]\s+/gm, '- ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return limpio.length > MAXIMO_CARACTERES ? `${limpio.slice(0, MAXIMO_CARACTERES).trimEnd()}…` : limpio;
}

// Red de seguridad que no depende del modelo: ante señales de riesgo, la respuesta siempre incluye a quién llamar.
const RIESGO = [
  {
    patron: /suicid|quitarme la vida|matarme|hacerme dano|autolesi|no quiero (seguir )?vivir|cortarme/,
    numero: '4141',
    aviso: 'Si estás pensando en hacerte daño, pide ayuda ahora: llama gratis al *4141, la línea de prevención del suicidio (24 horas).',
  },
  {
    patron: /dolor (en el|de) pecho|no puedo respirar|me cuesta respirar|desmay|perdi el conocimiento|convulsi/,
    numero: '131',
    aviso: 'Si es una emergencia, llama de inmediato al SAMU (131).',
  },
];
function agregarAvisos(textoUsuario, respuesta) {
  const normalizado = sinTildes(textoUsuario);
  return RIESGO.reduce((texto, { patron, numero, aviso }) => (
    patron.test(normalizado) && !texto.includes(numero) ? `${texto}\n\n${aviso}` : texto
  ), respuesta);
}

const respuestaSimulada = (texto) => 'Modo de prueba: esta es una respuesta de ejemplo, porque el asistente todavía no tiene '
  + `configurado su proveedor de IA. Recibí tu mensaje: «${resumir(texto, 120)}».\n\nCuando esté activo, aquí verás una `
  + 'orientación general sobre tu consulta. Recuerda que el asistente no reemplaza la atención de un profesional de salud.';

const noDisponible = (mensaje = 'El asistente no está disponible en este momento. Intenta nuevamente en unos minutos.') => new ErrorHttp(503, mensaje);

async function consultarProveedor(mensajes) {
  let respuesta;
  try {
    respuesta = await fetch(`${ia.urlBase}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ia.apiKey}` },
      body: JSON.stringify({
        model: ia.modelo,
        messages: [
          { role: 'system', content: INSTRUCCIONES },
          ...mensajes.map(({ remitente, contenido }) => ({ role: remitente === 'usuario' ? 'user' : 'assistant', content: contenido })),
        ],
        max_tokens: MAXIMO_TOKENS,
        temperature: 0.5,
      }),
      signal: AbortSignal.timeout(TIEMPO_ESPERA_MS),
    });
  } catch {
    throw noDisponible();
  }
  // Solo se registra el código: el contenido de la conversación nunca va a los registros del servidor.
  if (respuesta.status === 429) throw noDisponible('El asistente recibió muchas consultas. Intenta nuevamente en un momento.');
  if (!respuesta.ok) {
    console.error(`El proveedor de IA respondió ${respuesta.status}`);
    throw noDisponible();
  }
  const datos = await respuesta.json().catch(() => null);
  const texto = datos?.choices?.[0]?.message?.content;
  if (typeof texto !== 'string' || !limpiar(texto)) throw noDisponible();
  return limpiar(texto);
}

// mensajes: [{ remitente: 'usuario' | 'asistente', contenido }], el último es el del usuario.
async function responder(mensajes) {
  const ultimo = mensajes.at(-1).contenido;
  const texto = ia.apiKey ? await consultarProveedor(mensajes) : respuestaSimulada(ultimo);
  return agregarAvisos(ultimo, texto);
}

module.exports = { responder, modo, limpiar, agregarAvisos, resumir, INSTRUCCIONES };

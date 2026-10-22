// Proveedor de IA del asistente (FS-HU-07, DAS D33). Cliente genérico para cualquier API compatible con OpenAI
// (POST {IA_URL_BASE}/chat/completions), sin SDK: Groq por defecto, en su plan gratuito. Sin IA_API_KEY responde en
// modo simulado. Al proveedor solo viajan estas instrucciones y los últimos mensajes de la conversación: nunca el
// nombre, el correo, el perfil ni la información de salud de la persona (DAS, QS7).
// FS-HU-08 (DAS D34): si recomienda un tipo de profesional, el modelo lo marca en una línea final que el backend valida
// contra el catálogo de especialidades y quita del texto visible.
const { profesionales: { especialidades: ESPECIALIDADES } } = require('../../../shared/reglas.json');
const { ia } = require('../config/env');
const ErrorHttp = require('../utils/ErrorHttp');

const TIEMPO_ESPERA_MS = 20000;
const MAXIMO_TOKENS = 700;
const MAXIMO_CARACTERES = 4000;
const MARCA = 'ESPECIALIDAD';

const INSTRUCCIONES = `Eres el asistente de orientación de FitSearch, una plataforma chilena que conecta a las personas con profesionales de salud, deporte y bienestar (nutrición, kinesiología, entrenamiento personal, medicina deportiva y psicología deportiva).

Tu función:
- Entregar orientación general sobre alimentación, actividad física, descanso, hábitos saludables y bienestar.
- Explicar cómo usar FitSearch: buscar profesionales por especialidad, comuna o cercanía, ver su ficha y sus reseñas, reservar una hora, guardar favoritos y completar el perfil.
- Cuando la persona describa una necesidad que un profesional puede atender, recomendar un solo tipo de profesional de FitSearch.

Límites:
- No diagnosticas enfermedades, no indicas medicamentos ni dosis y no reemplazas la atención de un profesional de salud; dilo con naturalidad cuando la pregunta lo requiera.
- Menciona el SAMU (131) solo ante una situación crítica que necesita atención inmediata, por ejemplo: un hueso roto o expuesto, un golpe fuerte en la cabeza con confusión o vómitos, dolor fuerte en el pecho o dolor en el pecho mientras hace ejercicio, dificultad para respirar, hinchazón de la garganta, un desmayo, convulsiones o un sangrado que no se detiene. En ese caso, indícale que llame de inmediato al SAMU (131).
- En molestias leves o comunes (agujetas, dolor muscular después de entrenar, una torcedura leve, cansancio o un mareo pasajero) no menciones el SAMU ni el 131: entrega orientación y recomienda el profesional adecuado.
- Si menciona pensamientos de hacerse daño o de suicidio, responde con empatía y entrégale la línea de prevención del suicidio *4141 (gratuita, 24 horas).
- Si la pregunta no tiene relación con salud, deporte, bienestar o FitSearch, explica con amabilidad que solo puedes ayudar con esos temas.
- No pidas datos que identifiquen a la persona (nombre, RUT, dirección o teléfono).

Recomendación de profesional:
- Si recomiendas un tipo de profesional, termina tu respuesta con una última línea exactamente así: ${MARCA}: <nombre>, donde <nombre> es uno de estos: ${ESPECIALIDADES.join(', ')}.
- Si la pregunta es general o no corresponde recomendar, no agregues esa línea.

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
// El SAMU (131) se agrega solo ante situaciones críticas; las molestias leves (agujetas, un dolor muscular, «casi me
// desmayo») no llevan el aviso (decisión del PO del 22-10-2026, SC-26).
const PARTES_DEL_CUERPO = '(pierna|brazo|pie|mano|tobillo|muneca|rodilla|cadera|clavicula|costilla|hueso|nariz|cuello|columna|craneo)';
const RIESGO = [
  {
    patron: /suicid|quitarme la vida|matarme|hacerme dano|autolesi|no quiero (seguir )?vivir|cortarme/,
    numero: '4141',
    aviso: 'Si estás pensando en hacerte daño, pide ayuda ahora: llama gratis al *4141, la línea de prevención del suicidio (24 horas).',
  },
  {
    patron: new RegExp([
      'no puedo respirar', 'me cuesta (mucho )?respirar', 'me ahogo', 'se me (esta )?(cierra|cerrando|hincha|hinchando) la garganta',
      'no reacciona', 'inconsciente', 'perdio el conocimiento', 'perdi el conocimiento', 'convulsi', '(?<!casi )(me|se) desmay(e|o)\\b',
      'dolor (muy )?(fuerte|intenso) (en el|de|del) pecho', 'dolor (en el|de) pecho (al|mientras|cuando) (corr|entren|hac|nad|pedale|jug)',
      'pecho que se (me )?(va|irradia|corre|pasa) al brazo', 'opresion en el pecho',
      `(rompi|rompio|quebre|quebro|fracture|fracturo)( el| la| los| las| mi)? ${PARTES_DEL_CUERPO}`, 'fractura', 'hueso (expuesto|afuera|salido)',
      'sangr\\w*[^.]{0,30}(mucho|abundante|no (para|se detiene))', 'hemorragia',
    ].join('|')),
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

// Toma la especialidad marcada al final ("ESPECIALIDAD: Kinesiología"), la acepta solo si está en el catálogo (sin
// importar tildes ni mayúsculas) y quita la marca del texto que se muestra. A veces el modelo la escribe al final de la
// última frase en vez de en una línea aparte: ahí se exige la marca en mayúsculas, para no cortar una frase normal.
const MARCAS = [
  new RegExp(`^[ \\t-]*${MARCA}\\s*:[ \\t]*(.*?)[ \\t.]*$`, 'gim'),
  new RegExp(`[ \\t]+${MARCA}\\s*:[ \\t]*(.*?)[ \\t.]*$`, 'gm'),
];
function extraerEspecialidad(texto) {
  const marcadas = [];
  const visible = MARCAS.reduce((resto, marca) => resto.replace(marca, (_, nombre) => {
    marcadas.push(sinTildes(nombre));
    return '';
  }), texto).replace(/\n{3,}/g, '\n\n').trim();
  const especialidad = marcadas.length ? ESPECIALIDADES.find((nombre) => sinTildes(nombre) === marcadas.at(-1)) : undefined;
  return { texto: visible, especialidad: especialidad ?? null };
}

const respuestaSimulada = (texto) => 'Modo de prueba: esta es una respuesta de ejemplo, porque el asistente todavía no tiene '
  + `configurado su proveedor de IA. Recibí tu mensaje: «${resumir(texto, 120)}».\n\nCuando esté activo, aquí verás una `
  + 'orientación general sobre tu consulta. Recuerda que el asistente no reemplaza la atención de un profesional de salud.';

// Solo en modo de prueba: palabras clave para mostrar la recomendación (FS-HU-08) sin proveedor de IA.
const CLAVES_DE_PRUEBA = [
  ['Kinesiología', /dolor|duele|lesion|rodilla|espalda|tobillo|esguince|tendin|hombro/],
  ['Medicina deportiva', /chequeo|examen|mareo|corazon|presion/],
  ['Nutrición', /comer|comida|dieta|aliment|peso|calori|proteina/],
  ['Psicología deportiva', /ansiedad|motivaci|desmotivad|estres|nervios|concentraci/],
  ['Entrenamiento personal', /rutina|entrenar|musculo|ejercicio|gimnasio|fuerza/],
];
const especialidadDePrueba = (texto) => CLAVES_DE_PRUEBA.find(([, patron]) => patron.test(sinTildes(texto)))?.[0] ?? null;

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
// Devuelve { contenido, especialidad }: especialidad es un nombre del catálogo o null (FS-HU-08).
async function responder(mensajes) {
  const ultimo = mensajes.at(-1).contenido;
  const { texto, especialidad } = ia.apiKey
    ? extraerEspecialidad(await consultarProveedor(mensajes))
    : { texto: respuestaSimulada(ultimo), especialidad: especialidadDePrueba(ultimo) };
  if (!texto) throw noDisponible();
  return { contenido: agregarAvisos(ultimo, texto), especialidad };
}

module.exports = { responder, modo, limpiar, agregarAvisos, extraerEspecialidad, resumir, INSTRUCCIONES };

// Proveedor de IA del asistente (FS-HU-07, DAS D33). Cliente genérico para cualquier API compatible con OpenAI
// (POST {IA_URL_BASE}/chat/completions), sin SDK: Groq por defecto, en su plan gratuito. Sin IA_API_KEY responde en
// modo simulado. Al proveedor solo viajan estas instrucciones y los últimos mensajes de la conversación: nunca el
// nombre, el correo, el perfil ni la información de salud de la persona (DAS, QS7).
// FS-HU-08 (DAS D34): si recomienda un tipo de profesional, el modelo lo marca en una línea final que el backend valida
// contra el catálogo de especialidades y quita del texto visible. FS-HU-30: el catálogo está en la base de datos y el
// asistente recibe las especialidades activas en cada respuesta.
// FS-HU-09: si la persona pide agregar alimentos a sus comidas, el modelo llama a la función agregar_alimentos; el
// backend valida y registra los alimentos y arma la respuesta. El modelo nunca accede a la base de datos.
// SC-47: bajo la recomendación, la aplicación muestra profesionales reales de la base de datos (el modelo no los conoce
// ni los inventa); si la persona pregunta cómo va hoy, el modelo llama a resumen_del_dia y el backend arma la respuesta
// con sus datos, que nunca viajan al proveedor. La respuesta también puede llegar mientras se escribe (en vivo). Solo si
// la persona lo autoriza, las instrucciones incluyen un resumen de su perfil (sin nombre, correo ni teléfono).
const { comidas: reglasComidas } = require('../../../shared/reglas.json');
const { ia } = require('../config/env');
const ErrorHttp = require('../utils/ErrorHttp');

const TIEMPO_ESPERA_MS = 20000;
const MAXIMO_TOKENS = 700;
const MAXIMO_CARACTERES = 4000;
const MARCA = 'ESPECIALIDAD';
const HERRAMIENTA = 'agregar_alimentos';
const RESUMEN = 'resumen_del_dia';
const MOMENTOS = reglasComidas.momentos.map(({ valor }) => valor);

const enumerar = (elementos) => (elementos.length < 2 ? elementos.join('') : `${elementos.slice(0, -1).join(', ')} y ${elementos.at(-1)}`);

// Sin especialidades activas no se pide la marca de recomendación (no habría a quién recomendar).
const recomendacion = (especialidades) => (especialidades.length > 0
  ? `- Si recomiendas un tipo de profesional, termina tu respuesta con una última línea exactamente así: ${MARCA}: <nombre>, donde <nombre> es uno de estos: ${especialidades.join(', ')}.
- Bajo tu respuesta, FitSearch le mostrará profesionales reales de esa especialidad: los más cercanos si quiere atención presencial o los mejor evaluados si la prefiere online, y podrá ver solo los verificados, ver su ficha y reservar ahí mismo. Dile en una frase que abajo tiene esas opciones.
- No expliques cómo buscar, filtrar ni usar el buscador, y no le digas que ingrese la especialidad o elija opciones: eso ya lo hace FitSearch por ella.
- Nunca inventes ni nombres profesionales, centros o precios: tú no conoces quiénes están en FitSearch.
- Si la pregunta es general o no corresponde recomendar, no agregues esa línea.`
  : '- Por ahora no recomiendes un tipo de profesional: solo entrega orientación general.');

// SC-47: resumen del perfil que la persona autorizó usar, para personalizar las respuestas.
const seccionPerfil = (perfil) => (perfil ? `

Perfil de la persona (autorizó usarlo para personalizar tus respuestas):
${perfil}
- Usa estos datos para adaptar lo que recomiendas: porciones y calorías según su plan, intensidad del ejercicio según su actividad y su objetivo, descanso según sus horas de sueño, y evita lo que no le conviene por sus alergias o condiciones.
- No repitas sus datos completos ni los menciones si no vienen al caso. Si falta un dato, no lo inventes.
- Si por su salud una recomendación puede ser riesgosa, dilo con cuidado y sugiere consultar a un profesional.` : '');

const instrucciones = (especialidades, perfil = null) => `Eres el asistente de orientación de FitSearch, una plataforma chilena que conecta a las personas con profesionales de salud, deporte y bienestar${especialidades.length > 0 ? ` (${enumerar(especialidades.map((nombre) => nombre.toLowerCase()))})` : ''}.

Tu función:
- Entregar orientación general sobre alimentación, actividad física, descanso, hábitos saludables y bienestar.
- Si la persona pregunta cómo usar FitSearch, explicarle cómo hacerlo (ver una ficha y sus reseñas, reservar una hora, guardar favoritos o completar el perfil).
- Cuando la persona describa una necesidad que un profesional puede atender o pida un profesional, recomendar un solo tipo de profesional de FitSearch.

Límites:
- No diagnosticas enfermedades, no indicas medicamentos ni dosis y no reemplazas la atención de un profesional de salud; dilo con naturalidad cuando la pregunta lo requiera.
- Menciona el SAMU (131) solo ante una situación crítica que necesita atención inmediata, por ejemplo: un hueso roto o expuesto, un golpe fuerte en la cabeza con confusión o vómitos, dolor fuerte en el pecho o dolor en el pecho mientras hace ejercicio, dificultad para respirar, hinchazón de la garganta, un desmayo, convulsiones o un sangrado que no se detiene. En ese caso, indícale que llame de inmediato al SAMU (131).
- En molestias leves o comunes (agujetas, dolor muscular después de entrenar, una torcedura leve, cansancio o un mareo pasajero) no menciones el SAMU ni el 131: entrega orientación y recomienda el profesional adecuado.
- Si menciona pensamientos de hacerse daño o de suicidio, responde con empatía y entrégale la línea de prevención del suicidio *4141 (gratuita, 24 horas).
- Si la pregunta no tiene relación con salud, deporte, bienestar o FitSearch, explica con amabilidad que solo puedes ayudar con esos temas.
- No pidas datos que identifiquen a la persona (nombre, RUT, dirección o teléfono).

Recomendación de profesional:
${recomendacion(especialidades)}

Registro de comidas:
- Si la persona te pide agregar, anotar o registrar alimentos en sus comidas (por ejemplo: «añade 100 g de pollo a mis comidas»), usa la función ${HERRAMIENTA} con cada alimento y sus gramos, y el momento del día si lo indica.
- Si da unidades en vez de gramos (2 huevos, 1 plátano), conviértelas a gramos según una porción habitual.
- Si no queda claro qué alimento o qué cantidad, pregúntale antes de agregar.
- Si solo pregunta por calorías o nutrición, responde sin agregar nada.

Cómo va su día:
- Si la persona pregunta cómo va hoy con sus comidas, calorías, proteínas, carbohidratos, grasas o agua (por ejemplo: «¿cómo voy hoy?» o «¿cuánta proteína me falta?»), usa la función ${RESUMEN}. No inventes cifras de su consumo.

Forma de responder:
- En español de Chile, cercano y claro, tuteando.
- Breve: entre 2 y 6 frases o una lista corta.
- Solo texto simple: sin títulos, tablas ni negritas. Para listas, usa líneas que empiecen con "- ".${seccionPerfil(perfil)}`;

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
    // Incluye las formas directas de decirlo, como «me quiero matar» o «quiero morir», que antes no se reconocían.
    patron: /suicid|quitarme la vida|matarme|me (quiero|voy a) matar|(quiero|ganas de) morir|(acabar|terminar) con mi vida|hacerme dano|autolesi|no quiero (seguir )?vivir|cortarme/,
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
function extraerEspecialidad(texto, especialidades) {
  const marcadas = [];
  const visible = MARCAS.reduce((resto, marca) => resto.replace(marca, (_, nombre) => {
    marcadas.push(sinTildes(nombre));
    return '';
  }), texto).replace(/\n{3,}/g, '\n\n').trim();
  const especialidad = marcadas.length ? especialidades.find((nombre) => sinTildes(nombre) === marcadas.at(-1)) : undefined;
  return { texto: visible, especialidad: especialidad ?? null };
}

const respuestaSimulada = (texto) => 'Modo de prueba: esta es una respuesta de ejemplo, porque el asistente todavía no tiene '
  + `configurado su proveedor de IA. Recibí tu mensaje: «${resumir(texto, 120)}».\n\nCuando esté activo, aquí verás una `
  + 'orientación general sobre tu consulta. Recuerda que el asistente no reemplaza la atención de un profesional de salud.';

// Solo en modo de prueba: palabras clave para mostrar la recomendación (FS-HU-08) sin proveedor de IA, si la especialidad
// está activa.
const CLAVES_DE_PRUEBA = [
  ['Kinesiología', /dolor|duele|lesion|rodilla|espalda|tobillo|esguince|tendin|hombro/],
  ['Medicina deportiva', /chequeo|examen|mareo|corazon|presion/],
  ['Nutrición', /comer|comida|dieta|aliment|peso|calori|proteina/],
  ['Psicología deportiva', /ansiedad|motivaci|desmotivad|estres|nervios|concentraci/],
  ['Entrenamiento personal', /rutina|entrenar|musculo|ejercicio|gimnasio|fuerza/],
];
function especialidadDePrueba(texto, especialidades) {
  const nombre = CLAVES_DE_PRUEBA.find(([, patron]) => patron.test(sinTildes(texto)))?.[0];
  return especialidades.find((activa) => sinTildes(activa) === sinTildes(nombre ?? '')) ?? null;
}

// Solo en modo de prueba: reconoce «agrega 100 g de pollo y 150 g de arroz al almuerzo» para probar el registro de
// comidas desde el chat (FS-HU-09) sin proveedor de IA. Sin gramos explícitos responde como un mensaje normal.
const PEDIDO_DE_PRUEBA = /\b(agreg|anad|anot|registr|sum)/;
const PORCION_DE_PRUEBA = /(\d+(?:[.,]\d+)?)\s*(?:g|gr|grs|gramos)\b\s*(?:de\s+)?([a-zñ][a-zñ ]*?)(?=\s*(?:[,;.]|$)|\s+y\s+\d|\s+(?:al|a|en|para)\b)/g;
const MOMENTOS_DE_PRUEBA = [['media_manana', /media manana/], ['desayuno', /desayuno/], ['almuerzo', /almuerzo/], ['merienda', /merienda|\bonce\b/], ['cena', /\bcena\b/]];
function accionDePrueba(texto) {
  const normalizado = sinTildes(texto);
  if (!PEDIDO_DE_PRUEBA.test(normalizado)) return null;
  const alimentos = [...normalizado.matchAll(PORCION_DE_PRUEBA)].map(([, gramos, nombre]) => ({ nombre: nombre.trim(), gramos: Number(gramos.replace(',', '.')) }));
  if (alimentos.length === 0) return null;
  return { alimentos, momento: MOMENTOS_DE_PRUEBA.find(([, patron]) => patron.test(normalizado))?.[0] ?? null };
}

// Solo en modo de prueba: «¿cómo voy hoy?» o «¿cuánta proteína me falta?» piden el resumen del día (SC-47).
const RESUMEN_DE_PRUEBA = /como (voy|vamos|va mi dia)|cuant[oa]s? (calorias |proteinas? |agua |carbohidratos |grasas )?(llevo|me falta)|me falta[n]? (de )?(proteina|calorias|agua|carbohidratos|grasas)|resumen (de|del) (hoy|dia)/;

// Funciones que el modelo puede pedir (formato de herramientas de la API compatible con OpenAI).
const HERRAMIENTAS = [{
  type: 'function',
  function: {
    name: HERRAMIENTA,
    description: 'Agrega alimentos con sus gramos a las comidas de hoy de la persona en FitSearch. Úsala solo cuando pida agregar, anotar o registrar lo que comió.',
    parameters: {
      type: 'object',
      properties: {
        alimentos: {
          type: 'array',
          maxItems: reglasComidas.alimentosPorMensaje,
          items: {
            type: 'object',
            properties: {
              nombre: { type: 'string', description: 'Alimento en español, por ejemplo: pechuga de pollo' },
              gramos: { type: 'number', description: 'Cantidad en gramos' },
            },
            required: ['nombre', 'gramos'],
          },
        },
        momento: { type: 'string', enum: MOMENTOS, description: 'Momento del día, solo si la persona lo indica' },
      },
      required: ['alimentos'],
    },
  },
}, {
  type: 'function',
  function: {
    name: RESUMEN,
    description: 'Muestra cómo va hoy la persona en FitSearch: calorías, proteínas, carbohidratos y grasas que lleva frente a su plan, y el agua frente a su meta. Úsala cuando pregunte cómo va su día o cuánto le falta.',
    parameters: { type: 'object', properties: {} },
  },
}];

// Acción que pidió el modelo: agregar alimentos ({ pedido }) o el resumen del día ({ resumen: true }). Devuelve null si
// la respuesta no trae ninguna o viene mal formada.
function leerAccion(llamadas) {
  const lista = Array.isArray(llamadas) ? llamadas : [];
  const llamada = lista.find((item) => item?.function?.name === HERRAMIENTA);
  if (llamada) {
    try {
      const { alimentos, momento } = JSON.parse(llamada.function.arguments);
      if (Array.isArray(alimentos) && alimentos.length > 0) return { pedido: { alimentos, momento: MOMENTOS.includes(momento) ? momento : null } };
    } catch {
      // Argumentos mal formados: se trata como si no hubiera pedido.
    }
  }
  return lista.some((item) => item?.function?.name === RESUMEN) ? { resumen: true } : null;
}

const noDisponible = (mensaje = 'El asistente no está disponible en este momento. Intenta nuevamente en unos minutos.') => new ErrorHttp(503, mensaje);

const cuerpoDe = (mensajes, especialidades, perfil, enVivo = false) => JSON.stringify({
  model: ia.modelo,
  messages: [
    { role: 'system', content: instrucciones(especialidades, perfil) },
    ...mensajes.map(({ remitente, contenido }) => ({ role: remitente === 'usuario' ? 'user' : 'assistant', content: contenido })),
  ],
  tools: HERRAMIENTAS,
  tool_choice: 'auto',
  max_tokens: MAXIMO_TOKENS,
  temperature: 0.5,
  ...(enVivo && { stream: true }),
});

async function pedirAlProveedor(cuerpo) {
  let respuesta;
  try {
    respuesta = await fetch(`${ia.urlBase}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ia.apiKey}` },
      body: cuerpo,
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
  return respuesta;
}

// Texto o acción final de la respuesta, igual si llegó completa o en vivo.
function resultadoDe(texto, llamadas) {
  const accion = leerAccion(llamadas);
  if (accion) return accion;
  if (typeof texto !== 'string' || !limpiar(texto)) throw noDisponible();
  return { texto: limpiar(texto) };
}

async function consultarProveedor(mensajes, especialidades, perfil) {
  const respuesta = await pedirAlProveedor(cuerpoDe(mensajes, especialidades, perfil));
  const datos = await respuesta.json().catch(() => null);
  const mensaje = datos?.choices?.[0]?.message;
  return resultadoDe(mensaje?.content, mensaje?.tool_calls);
}

// Lo que ya se puede mostrar de una respuesta que llega en vivo (SC-47): sin formato, sin la marca de especialidad y
// sin el final de la última línea mientras pueda ser el comienzo de esa marca.
function visibleParcial(texto) {
  let parcial = texto.replace(/<think>[\s\S]*?(<\/think>|$)/gi, '');
  const corte = parcial.lastIndexOf('\n') + 1;
  const cabeza = sinTildes(parcial.slice(corte).replace(/^[ \t-]*/, '')).toUpperCase();
  if (cabeza && (MARCA.startsWith(cabeza) || cabeza.startsWith(MARCA))) parcial = parcial.slice(0, corte);
  parcial = parcial
    .replace(new RegExp(`[ \\t]+${MARCA}\\s*:[^\\n]*$`), '')
    .replace(/[ \t]+([A-Z]{3,})$/, (todo, palabra) => (MARCA.startsWith(palabra) ? '' : todo));
  return extraerEspecialidad(limpiar(parcial), []).texto.replace(/\*\*|__/g, '');
}

// En vivo (SC-47): el proveedor envía la respuesta por partes (eventos «data:» de la API compatible con OpenAI). Se van
// juntando el texto y las llamadas a funciones, y alTexto recibe lo que ya se puede mostrar.
async function consultarEnVivo(mensajes, especialidades, perfil, alTexto) {
  const respuesta = await pedirAlProveedor(cuerpoDe(mensajes, especialidades, perfil, true));
  if (!respuesta.body) throw noDisponible();
  const decodificador = new TextDecoder();
  const llamadas = [];
  let pendiente = '';
  let texto = '';
  const procesar = (linea) => {
    const limpia = linea.trim();
    if (!limpia.startsWith('data:')) return;
    const dato = limpia.slice(5).trim();
    if (!dato || dato === '[DONE]') return;
    let evento;
    try {
      evento = JSON.parse(dato);
    } catch {
      return;
    }
    const delta = evento?.choices?.[0]?.delta ?? {};
    if (typeof delta.content === 'string' && delta.content) {
      texto += delta.content;
      alTexto(visibleParcial(texto));
    }
    for (const parte of delta.tool_calls ?? []) {
      const indice = parte.index ?? 0;
      llamadas[indice] ??= { function: { name: '', arguments: '' } };
      if (parte.function?.name) llamadas[indice].function.name += parte.function.name;
      if (parte.function?.arguments) llamadas[indice].function.arguments += parte.function.arguments;
    }
  };
  try {
    for await (const trozo of respuesta.body) {
      pendiente += decodificador.decode(trozo, { stream: true });
      const lineas = pendiente.split('\n');
      pendiente = lineas.pop();
      lineas.forEach(procesar);
    }
    procesar(pendiente);
  } catch {
    throw noDisponible();
  }
  return resultadoDe(texto, llamadas.filter(Boolean));
}

// Respuesta sin proveedor de IA (modo de prueba). Con permiso, avisa que tomó en cuenta el perfil, para probarlo.
const NOTA_PERFIL_DE_PRUEBA = 'Con tu permiso, tomé en cuenta los datos de tu perfil para personalizar esta respuesta.';
function respuestaDePrueba(ultimo, especialidades, perfil) {
  const pedido = accionDePrueba(ultimo);
  if (pedido) return { pedido };
  if (RESUMEN_DE_PRUEBA.test(sinTildes(ultimo))) return { resumen: true };
  const texto = perfil ? `${respuestaSimulada(ultimo)}\n\n${NOTA_PERFIL_DE_PRUEBA}` : respuestaSimulada(ultimo);
  return { contenido: agregarAvisos(ultimo, texto), especialidad: especialidadDePrueba(ultimo, especialidades) };
}

function terminar(ultimo, resultado, especialidades) {
  if (resultado.pedido) return { pedido: resultado.pedido };
  if (resultado.resumen) return { resumen: true };
  const { texto, especialidad } = extraerEspecialidad(resultado.texto, especialidades);
  if (!texto) throw noDisponible();
  return { contenido: agregarAvisos(ultimo, texto), especialidad };
}

// mensajes: [{ remitente: 'usuario' | 'asistente', contenido }], el último es el del usuario; especialidades: nombres
// de las especialidades activas del catálogo (FS-HU-30).
// Devuelve { contenido, especialidad }: especialidad es un nombre del catálogo o null (FS-HU-08). Si la persona pidió
// agregar alimentos (FS-HU-09), devuelve { pedido: { alimentos, momento } }, y si preguntó cómo va su día (SC-47),
// { resumen: true }: en ambos casos el asistente arma la respuesta. opciones.perfil: resumen del perfil autorizado (SC-47).
async function responder(mensajes, especialidades = [], { perfil = null } = {}) {
  const ultimo = mensajes.at(-1).contenido;
  if (!ia.apiKey) return respuestaDePrueba(ultimo, especialidades, perfil);
  return terminar(ultimo, await consultarProveedor(mensajes, especialidades, perfil), especialidades);
}

// En modo de prueba la respuesta simulada también llega por partes, para probar la pantalla sin proveedor.
const PAUSA_DE_PRUEBA_MS = process.env.NODE_ENV === 'test' ? 0 : 35;
async function entregarPorPartes(texto, alTexto) {
  const palabras = texto.split(/(?<=\s)/);
  let visible = '';
  for (let i = 0; i < palabras.length; i += 4) {
    visible += palabras.slice(i, i + 4).join('');
    alTexto(visible.trim());
    if (PAUSA_DE_PRUEBA_MS) await new Promise((resolver) => { setTimeout(resolver, PAUSA_DE_PRUEBA_MS); });
  }
}

// Igual que responder, pero alTexto(textoVisible) se llama cada vez que llega una parte de la respuesta (SC-47).
async function responderEnVivo(mensajes, especialidades = [], alTexto = () => {}, { perfil = null } = {}) {
  const ultimo = mensajes.at(-1).contenido;
  if (!ia.apiKey) {
    const resultado = respuestaDePrueba(ultimo, especialidades, perfil);
    if (resultado.contenido) await entregarPorPartes(resultado.contenido, alTexto);
    return resultado;
  }
  return terminar(ultimo, await consultarEnVivo(mensajes, especialidades, perfil, alTexto), especialidades);
}

module.exports = {
  responder, responderEnVivo, modo, limpiar, agregarAvisos, extraerEspecialidad, visibleParcial, resumir, instrucciones, HERRAMIENTAS,
};

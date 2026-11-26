// SC-47: cómo quiere atenderse la persona (presencial u online) y qué profesionales prefiere ver primero (los más
// cercanos, los mejor evaluados o solo los verificados), según lo que escribió. Se busca primero en su último mensaje y,
// si no dice nada, en los anteriores de la conversación. Lo que no se dice queda en null: la tarjeta de la
// recomendación pregunta la modalidad y usa el orden propio de cada una.
const sinTildes = (texto) => texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const MODALIDADES = [
  ['online', /\b(online|on line|en linea|virtual(es)?|videollamadas?|video llamadas?|a distancia|remot[oa]s?|por (zoom|meet|teams|video))\b/],
  ['presencial', /\b(presencial(es)?|en persona|cerca|cercan[oa]s?|cerquita|mi comuna|mi barrio|mi sector)\b/],
];
const CRITERIOS = [
  ['verificados', /verificad|certificad|confiable/],
  ['calificacion', /\b(resenas?|estrellas?|opiniones|valoraciones)\b|mejor(es)? (evaluad|calificad|valorad|puntuad|recomendad)|bien (evaluad|calificad)|buenas? (calificaciones|comentarios|referencias)/],
  ['cercania', /\b(cerca|cercan[oa]s?|cerquita)\b/],
];

function detectar(textos, patrones) {
  for (const texto of textos) {
    const normalizado = sinTildes(texto ?? '');
    const hallado = patrones.find(([, patron]) => patron.test(normalizado));
    if (hallado) return hallado[0];
  }
  return null;
}

// textos: lo que escribió la persona, del mensaje más reciente al más antiguo.
function atencionPedida(textos) {
  const modalidad = detectar(textos, MODALIDADES);
  const criterio = detectar(textos, CRITERIOS);
  // Online no se ordena por cercanía: queda el orden propio de esa modalidad (los mejor evaluados).
  return { modalidad, criterio: criterio === 'cercania' && modalidad === 'online' ? null : criterio };
}

module.exports = { atencionPedida };

// Buscador por palabras del chat (FS-HU-31): no distingue mayúsculas ni tildes ("hola" encuentra "Hóla") y un resultado
// debe tener todas las palabras buscadas, en cualquier orden. Las palabras de una letra se ignoran.

// Texto sin tildes y en minúsculas, recordando de qué posición del original viene cada carácter, para marcar lo encontrado.
function plegar(texto) {
  let plano = '';
  const origen = [];
  let posicion = 0;
  for (const caracter of texto) {
    const simple = caracter.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
    for (let i = 0; i < simple.length; i += 1) origen.push(posicion);
    plano += simple;
    posicion += caracter.length;
  }
  origen.push(posicion);
  return { plano, origen };
}

export function terminos(consulta) {
  return [...new Set(plegar(consulta).plano.split(/\s+/).filter((t) => t.length >= 2))];
}

// Tramos [inicio, fin) del texto donde aparece cada palabra, unidos si se tocan; null si falta alguna palabra.
export function coincidencias(texto, palabras) {
  if (!palabras.length || !texto) return null;
  const { plano, origen } = plegar(texto);
  const tramos = [];
  for (const palabra of palabras) {
    let desde = plano.indexOf(palabra);
    if (desde < 0) return null;
    while (desde >= 0) {
      tramos.push([origen[desde], origen[desde + palabra.length]]);
      desde = plano.indexOf(palabra, desde + palabra.length);
    }
  }
  tramos.sort((a, b) => a[0] - b[0]);
  return tramos.reduce((unidos, [inicio, fin]) => {
    const ultimo = unidos.at(-1);
    if (ultimo && inicio <= ultimo[1]) ultimo[1] = Math.max(ultimo[1], fin);
    else unidos.push([inicio, fin]);
    return unidos;
  }, []);
}

// El texto en partes, marcando lo encontrado: [{ texto, marca }].
export function partes(texto, tramos = []) {
  const salida = [];
  let cursor = 0;
  for (const [inicio, fin] of tramos) {
    if (inicio > cursor) salida.push({ texto: texto.slice(cursor, inicio), marca: false });
    salida.push({ texto: texto.slice(inicio, fin), marca: true });
    cursor = fin;
  }
  if (cursor < texto.length) salida.push({ texto: texto.slice(cursor), marca: false });
  return salida;
}

// Extracto alrededor de la primera coincidencia, para la lista de resultados.
export function extracto(texto, tramos, margen = 40) {
  const [primero] = tramos;
  let inicio = Math.max(0, primero[0] - margen);
  let fin = Math.min(texto.length, primero[1] + margen * 2);
  if (inicio > 0) inicio = texto.lastIndexOf(' ', primero[0]) > inicio ? texto.indexOf(' ', inicio) + 1 : inicio;
  if (fin < texto.length) fin = Math.max(primero[1], texto.lastIndexOf(' ', fin));
  const dentro = tramos.filter(([a, b]) => b > inicio && a < fin).map(([a, b]) => [Math.max(a, inicio) - inicio, Math.min(b, fin) - inicio]);
  return { antes: inicio > 0, despues: fin < texto.length, partes: partes(texto.slice(inicio, fin), dentro) };
}

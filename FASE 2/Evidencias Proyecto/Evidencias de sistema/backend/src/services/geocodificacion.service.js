// Ubicación de atención a partir de la comuna y la dirección (SC-28, DAS D36). El profesional ya no escribe
// coordenadas: la API las busca en Nominatim, el buscador de direcciones de OpenStreetMap (gratuito, sin clave ni cuenta,
// los mismos datos del mapa, D31). Su política de uso pide identificar la aplicación, no pasar de una consulta por
// segundo y guardar las respuestas: por eso las consultas pasan por el backend, esperan su turno y se recuerdan un día.
const ErrorHttp = require('../utils/ErrorHttp');
const { ubicarComuna, ubicarRegion, nombreCompletoRegion } = require('../utils/regiones');
const { profesionales: { ubicacionChile: CHILE } } = require('../../../shared/reglas.json');

const URL_API = 'https://nominatim.openstreetmap.org/search';
const URL_INVERSA = 'https://nominatim.openstreetmap.org/reverse';
const AGENTE = 'FitSearch/1.0 (+https://github.com/rodriacr/FitSearch)';
const TIEMPO_ESPERA_MS = 5000;
const DURACION_CACHE_MS = 24 * 60 * 60 * 1000;
const MAXIMO_EN_CACHE = 500;
const INTERVALO_MS = 1100;

const normalizar = (texto) => texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/\s+/g, ' ').trim();

// Nominatim no entiende los complementos («oficina 501», «depto. 42», «#12») y con ellos deja de encontrar la calle:
// se busca solo la calle y el número. La dirección completa se guarda igual en la ficha.
const COMPLEMENTO = /\s+(?:of(?:icina)?|dep(?:to|artamento)?|dpto|local|piso|torre|block|casa)\.?\s*[a-z]?\d.*$/i;
const calleYNumero = (direccion) => direccion.split(',')[0].replace(/#.*$/, '').replace(COMPLEMENTO, '').trim();

// Con una comuna mal escrita Nominatim igual puede devolver una calle de otra comuna: se acepta un lugar solo si la
// comuna escrita aparece en su dirección (ciudad, comuna o barrio). En Santiago la comuna suele venir como barrio.
// El nombre propio del lugar solo cuenta al buscar la comuna: el de una calle («Avenida Nueva Providencia») no.
// Devuelve el nombre de la comuna tal como lo escribe OpenStreetMap («san antonio» → «San Antonio»), o null.
const CAMPOS_LUGAR = ['city', 'town', 'village', 'suburb', 'municipality', 'city_district', 'hamlet'];
function comunaDelLugar(lugar, comuna, { porNombre = false } = {}) {
  const buscada = normalizar(comuna);
  const nombres = [porNombre && lugar.name, ...CAMPOS_LUGAR.map((campo) => lugar.address?.[campo])].filter(Boolean);
  return nombres.find((nombre) => {
    const n = normalizar(nombre);
    return n === buscada || n.includes(buscada) || buscada.includes(n);
  }) ?? null;
}
const enChile = ({ lat, lon }) => Number(lat) >= CHILE.latMin && Number(lat) <= CHILE.latMax
  && Number(lon) >= CHILE.lngMin && Number(lon) <= CHILE.lngMax;

// Una consulta por segundo como máximo para toda la aplicación: cada búsqueda espera a que termine la anterior.
let fila = Promise.resolve();
let ultimaConsulta = 0;
let intervalo = INTERVALO_MS;
function enTurno(tarea) {
  const resultado = fila.then(async () => {
    const espera = ultimaConsulta + intervalo - Date.now();
    if (espera > 0) await new Promise((resolver) => { setTimeout(resolver, espera); });
    ultimaConsulta = Date.now();
    return tarea();
  });
  fila = resultado.catch(() => {});
  return resultado;
}

async function consultarNominatim(parametros) {
  const consulta = new URLSearchParams({
    ...parametros, countrycodes: 'cl', format: 'jsonv2', addressdetails: '1', limit: '5', 'accept-language': 'es',
  });
  const respuesta = await enTurno(() => fetch(`${URL_API}?${consulta}`, {
    headers: { 'User-Agent': AGENTE }, signal: AbortSignal.timeout(TIEMPO_ESPERA_MS),
  }));
  if (!respuesta.ok) throw new Error(`Nominatim respondió ${respuesta.status}`);
  const lugares = await respuesta.json();
  return Array.isArray(lugares) ? lugares.filter(enChile) : [];
}

// Nominatim entrega 7 decimales, los mismos que guarda la ficha (DECIMAL(10,7)).
const aUbicacion = (lugar, precision, encontrada) => ({ lat: Number(lugar.lat), lng: Number(lugar.lon), precision, encontrada });

// precision: «exacta» (calle y número), «calle» (la calle sin ese número) o «comuna» (el centro de la comuna: atiende
// solo online o no se encontró la dirección). La interfaz lo explica e invita a mover el marcador si no quedó exacto.
async function buscar(comuna, direccion) {
  const calle = direccion ? calleYNumero(direccion) : '';
  if (calle) {
    const lugar = (await consultarNominatim({ street: calle, city: comuna })).find((l) => comunaDelLugar(l, comuna));
    if (lugar) {
      const { road, pedestrian, footway, house_number: numero } = lugar.address ?? {};
      const via = road || pedestrian || footway || calle;
      const encontrada = `${[via, numero].filter(Boolean).join(' ')}, ${comunaDelLugar(lugar, comuna)}`;
      return aUbicacion(lugar, numero ? 'exacta' : 'calle', encontrada);
    }
  }
  const lugar = (await consultarNominatim({ city: comuna })).find((l) => comunaDelLugar(l, comuna, { porNombre: true }));
  return lugar ? aUbicacion(lugar, 'comuna', comunaDelLugar(lugar, comuna, { porNombre: true })) : null;
}

const cache = new Map();

async function ubicar({ comuna, direccion = '' }) {
  const clave = normalizar(`${direccion}|${comuna}`);
  const guardada = cache.get(clave);
  if (guardada && Date.now() - guardada.momento < DURACION_CACHE_MS) return guardada.ubicacion;

  let ubicacion;
  try {
    ubicacion = await buscar(comuna, direccion);
  } catch {
    throw new ErrorHttp(503, 'No pudimos buscar tu dirección en este momento. Intenta de nuevo en unos segundos.');
  }
  if (!ubicacion) {
    throw new ErrorHttp(404, 'No encontramos esa comuna en Chile', { comuna: 'No encontramos esa comuna en Chile. Revisa cómo está escrita.' });
  }
  if (cache.size >= MAXIMO_EN_CACHE) cache.clear();
  cache.set(clave, { momento: Date.now(), ubicacion });
  return ubicacion;
}

// Dirección de un punto del mapa (15-11-2026): cuando el profesional mueve el marcador, su comuna, su región y su
// dirección se actualizan solas. Usa la búsqueda inversa de Nominatim, con el mismo turno de una consulta por segundo y
// la misma caché. En Chile la comuna viene como barrio en Santiago («suburb»: Providencia, Puente Alto) y como ciudad en
// regiones («city»: San Antonio, cuyo «suburb» es el barrio Barrancas): se toma el primer campo que sea una comuna de la
// lista oficial y de la región que indica el lugar («state»: «Región de Valparaíso»).
// Revisión del PR 61 (16-11-2026): el punto tiene que estar en Chile y en una región reconocida. Antes, un marcador en
// Maipú (Mendoza, Argentina) caía dentro del recuadro de Chile y se guardaba como Maipú de la Región Metropolitana.
const CAMPOS_COMUNA = ['suburb', 'city_district', 'city', 'town', 'village', 'municipality', 'hamlet'];
function comunaDelPunto(direccion) {
  if (String(direccion.country_code ?? '').toLowerCase() !== 'cl') return null;
  const region = ubicarRegion(direccion.state);
  if (!region) return null;
  for (const campo of CAMPOS_COMUNA) {
    const ubicada = ubicarComuna(direccion[campo]);
    if (ubicada && ubicada.region === region) return ubicada;
  }
  return null;
}

async function consultarPunto({ lat, lng }, zoom = '18') {
  const consulta = new URLSearchParams({ lat, lon: lng, format: 'jsonv2', addressdetails: '1', zoom, 'accept-language': 'es' });
  const respuesta = await enTurno(() => fetch(`${URL_INVERSA}?${consulta}`, {
    headers: { 'User-Agent': AGENTE }, signal: AbortSignal.timeout(TIEMPO_ESPERA_MS),
  }));
  if (!respuesta.ok) throw new Error(`Nominatim respondió ${respuesta.status}`);
  return respuesta.json();
}

async function direccionDelPunto({ lat, lng }) {
  // 5 decimales son alrededor de un metro: dos puntos tan cercanos tienen la misma dirección.
  const clave = `punto|${lat.toFixed(5)}|${lng.toFixed(5)}`;
  const guardada = cache.get(clave);
  if (guardada && Date.now() - guardada.momento < DURACION_CACHE_MS) return guardada.ubicacion;

  let lugar;
  try {
    lugar = await consultarPunto({ lat, lng });
  } catch {
    throw new ErrorHttp(503, 'No pudimos buscar la dirección de ese punto en este momento. Intenta de nuevo en unos segundos.');
  }
  const ubicada = lugar?.address && comunaDelPunto(lugar.address);
  if (!ubicada) throw new ErrorHttp(404, 'No encontramos una comuna de Chile en ese punto. Mueve el marcador hasta tu lugar de atención.');
  const { road, pedestrian, footway, house_number: numero } = lugar.address;
  const via = road || pedestrian || footway;
  const resultado = {
    comuna: ubicada.comuna,
    region: ubicada.region,
    regionCompleta: nombreCompletoRegion(ubicada.region),
    direccion: via ? [via, numero].filter(Boolean).join(' ') : null,
    precision: numero ? 'exacta' : via ? 'calle' : 'comuna',
  };
  if (cache.size >= MAXIMO_EN_CACHE) cache.clear();
  cache.set(clave, { momento: Date.now(), ubicacion: resultado });
  return resultado;
}

// Nombre de ciudad o comuna para el clima. Recibe coordenadas aproximadas y no busca una dirección particular.
async function lugarDelPunto({ lat, lng }) {
  const clave = `clima|${lat.toFixed(2)}|${lng.toFixed(2)}`;
  const guardada = cache.get(clave);
  if (guardada && Date.now() - guardada.momento < DURACION_CACHE_MS) return guardada.nombre;
  const lugar = await consultarPunto({ lat, lng }, '12');
  const direccion = lugar?.address;
  const ubicada = direccion && comunaDelPunto(direccion);
  const nombre = ubicada?.comuna || direccion?.city || direccion?.town || direccion?.village || direccion?.municipality || null;
  if (nombre) {
    if (cache.size >= MAXIMO_EN_CACHE) cache.clear();
    cache.set(clave, { momento: Date.now(), nombre });
  }
  return nombre;
}

// Para las pruebas: vacía la caché y permite acortar la espera entre consultas.
const reiniciar = ({ intervaloMs = INTERVALO_MS } = {}) => { cache.clear(); ultimaConsulta = 0; intervalo = intervaloMs; };

module.exports = { ubicar, direccionDelPunto, lugarDelPunto, calleYNumero, reiniciar };

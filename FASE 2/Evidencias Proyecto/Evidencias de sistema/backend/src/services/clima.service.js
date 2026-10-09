// Clima actual para el Inicio del profesional (DAS, D26). Fuente: Open-Meteo (gratuita, sin clave ni cuenta;
// datos bajo licencia CC BY 4.0, por eso la interfaz la menciona). Si el servicio falla, el Inicio sigue funcionando.
const profesionalModel = require('../models/profesional.model');
const ErrorHttp = require('../utils/ErrorHttp');

const URL_API = 'https://api.open-meteo.com/v1/forecast';
const DURACION_CACHE_MS = 30 * 60 * 1000;
const TIEMPO_ESPERA_MS = 4000;
const MAXIMO_EN_CACHE = 500;
// Sin ficha profesional todavía, se muestra el clima del centro de Santiago.
const POR_DEFECTO = { lugar: 'Santiago', lat: -33.45, lng: -70.67 };

// Códigos WMO que entrega Open-Meteo, agrupados en los estados que la interfaz sabe dibujar.
const ESTADOS = [
  { codigos: [0], estado: 'despejado', descripcion: 'Despejado' },
  { codigos: [1, 2], estado: 'parcial', descripcion: 'Parcialmente nublado' },
  { codigos: [3], estado: 'nublado', descripcion: 'Nublado' },
  { codigos: [45, 48], estado: 'niebla', descripcion: 'Neblina' },
  { codigos: [51, 53, 55, 56, 57], estado: 'llovizna', descripcion: 'Llovizna' },
  { codigos: [61, 63, 65, 66, 67, 80, 81, 82], estado: 'lluvia', descripcion: 'Lluvia' },
  { codigos: [71, 73, 75, 77, 85, 86], estado: 'nieve', descripcion: 'Nieve' },
  { codigos: [95, 96, 99], estado: 'tormenta', descripcion: 'Tormenta' },
];
const describir = (codigo) => ESTADOS.find(({ codigos }) => codigos.includes(codigo)) ?? { estado: 'nublado', descripcion: 'Variable' };

// Varias consultas del mismo lugar en 30 minutos usan la misma respuesta.
const cache = new Map();

async function consultarOpenMeteo(lat, lng) {
  const parametros = new URLSearchParams({
    latitude: lat, longitude: lng, current: 'temperature_2m,weather_code,is_day', timezone: 'America/Santiago',
  });
  const respuesta = await fetch(`${URL_API}?${parametros}`, { signal: AbortSignal.timeout(TIEMPO_ESPERA_MS) });
  if (!respuesta.ok) throw new Error(`Open-Meteo respondió ${respuesta.status}`);
  const { current } = await respuesta.json();
  if (typeof current?.temperature_2m !== 'number') throw new Error('Open-Meteo no entregó la temperatura');
  return current;
}

async function actual(usuarioId) {
  const ficha = await profesionalModel.obtenerPorUsuario(usuarioId);
  // La ubicación se redondea a 2 decimales (cerca de 1 km): basta para el clima y no viaja exacta a un tercero.
  const redondear = (valor) => Math.round(Number(valor) * 100) / 100;
  const lat = ficha ? redondear(ficha.ubicacionLat) : POR_DEFECTO.lat;
  const lng = ficha ? redondear(ficha.ubicacionLng) : POR_DEFECTO.lng;
  const clave = `${lat},${lng}`;

  let datos = cache.get(clave);
  if (!datos || Date.now() - datos.momento > DURACION_CACHE_MS) {
    try {
      datos = { momento: Date.now(), actual: await consultarOpenMeteo(lat, lng) };
    } catch {
      throw new ErrorHttp(503, 'El clima no está disponible en este momento');
    }
    if (cache.size >= MAXIMO_EN_CACHE) cache.clear();
    cache.set(clave, datos);
  }

  const { estado, descripcion } = describir(datos.actual.weather_code);
  return {
    lugar: ficha?.comuna || POR_DEFECTO.lugar,
    temperatura: Math.round(datos.actual.temperature_2m),
    estado,
    descripcion,
    esDeDia: datos.actual.is_day === 1,
    fuente: 'Open-Meteo',
  };
}

const reiniciarCache = () => cache.clear();

module.exports = { actual, describir, reiniciarCache };

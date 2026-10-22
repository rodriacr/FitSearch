import reglas from '@shared/reglas.json';

// FitSearch funciona en Chile: el mapa no se aleja ni se mueve fuera del Chile continental (con un margen que incluye
// Juan Fernández). [suroeste, noreste] en [longitud, latitud], como usa MapLibre. Una ubicación fuera de este recuadro
// no se dibuja ni se usa para encuadrar: antes, una sola ficha con coordenadas erróneas alejaba el mapa hasta mostrar
// medio continente. Desde la SC-24 el mismo recuadro (shared/reglas.json) valida las coordenadas al guardar la ficha.
const { latMin, latMax, lngMin, lngMax } = reglas.profesionales.ubicacionChile;
export const CHILE = [[lngMin, latMin], [lngMax, latMax]];

export const coordenadas = (p) => (p.ubicacionLat != null && p.ubicacionLng != null
  && Number.isFinite(Number(p.ubicacionLat)) && Number.isFinite(Number(p.ubicacionLng))
  ? [Number(p.ubicacionLng), Number(p.ubicacionLat)] : null);

const enChile = ([lng, lat]) => lng >= CHILE[0][0] && lng <= CHILE[1][0] && lat >= CHILE[0][1] && lat <= CHILE[1][1];

// Tiene marcador en el mapa: coordenadas válidas dentro de Chile. La lista usa lo mismo para ofrecer «Ver en el mapa».
export const enMapa = (p) => Boolean(coordenadas(p)) && enChile(coordenadas(p));
// Tiene coordenadas, pero fuera de Chile: no se dibuja y se avisa bajo el mapa.
export const fueraDeChile = (p) => Boolean(coordenadas(p)) && !enChile(coordenadas(p));

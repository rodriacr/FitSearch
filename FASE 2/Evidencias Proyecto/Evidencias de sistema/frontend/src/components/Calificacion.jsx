import { formatearNumero, textoResenas } from '../services/formato.js';
import Icono from './Icono.jsx';

// Promedio compacto de una ficha: "★ 4,5 (12)". Sin reseñas lo dice en vez de mostrar un 0.
export function Calificacion({ promedio, total }) {
  if (!total) return <span className="calificacion calificacion--vacia">Sin reseñas aún</span>;
  return (
    <span className="calificacion" role="img" aria-label={`Calificación ${formatearNumero(promedio)} de 5, ${textoResenas(total)}`}>
      <Icono nombre="estrella" tamano={16} relleno />
      <strong>{formatearNumero(promedio)}</strong>
      <span>({total})</span>
    </span>
  );
}

// Cinco estrellas con las que corresponden al puntaje pintadas (reseñas y resumen de la ficha).
export function Estrellas({ valor, tamano = 18 }) {
  const llenas = Math.round(valor);
  return (
    <span className="estrellas" role="img" aria-label={`${formatearNumero(valor)} de 5 estrellas`}>
      {[1, 2, 3, 4, 5].map((numero) => (
        <Icono key={numero} nombre="estrella" tamano={tamano} relleno={numero <= llenas} className={numero <= llenas ? 'estrellas__llena' : 'estrellas__vacia'} />
      ))}
    </span>
  );
}

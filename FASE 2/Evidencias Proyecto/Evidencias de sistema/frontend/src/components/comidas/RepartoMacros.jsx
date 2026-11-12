import { formatearNumero } from '../../services/formato.js';
import { MACROS, gramos } from './planComun.js';

// Barra y lista del reparto de macronutrientes del plan de alimentación (11-11-2026).
// La barra: su texto está en la lista que la acompaña (o en otro lugar de la tarjeta), por eso la barra se oculta
// a los lectores de pantalla.
export function BarraReparto({ porcentajes, compacta = false }) {
  return (
    <div className={`reparto__barra${compacta ? ' reparto__barra--compacta' : ''}`} aria-hidden="true">
      {MACROS.map(({ clave, color }) => (porcentajes[clave] > 0
        ? <span key={clave} style={{ flexGrow: porcentajes[clave], '--color-nutriente': color }} />
        : null))}
    </div>
  );
}

export function Reparto({ porcentajes, kcal }) {
  return (
    <div className="reparto">
      <BarraReparto porcentajes={porcentajes} />
      <ul className="reparto__lista">
        {MACROS.map(({ clave, nombre, color }) => (
          <li key={clave} style={{ '--color-nutriente': color }}>
            <span className="reparto__punto" aria-hidden="true" />
            <span className="reparto__nombre">{nombre}</span>
            <strong>{porcentajes[clave] === null ? '—' : `${porcentajes[clave]} %`}</strong>
            <span className="reparto__gramos">{kcal && porcentajes[clave] !== null ? `${formatearNumero(gramos(kcal, porcentajes[clave], clave))} g` : '—'}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

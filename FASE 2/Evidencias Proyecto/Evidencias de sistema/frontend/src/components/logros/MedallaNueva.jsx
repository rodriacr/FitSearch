import { useState } from 'react';
import Dialogo from '../Dialogo.jsx';
import { formatearNumero } from '../../services/formato.js';
import Medalla from './Medalla.jsx';
import './MedallaNueva.css';

const NOMBRE_NIVEL = { bronce: 'Bronce', plata: 'Plata', oro: 'Oro', platino: 'Platino', secreta: 'Secreta', temporada: 'De temporada' };
const COLORES = ['#f47b20', '#4fb3ff', '#ffcf5c', '#3fcf96', '#ff5c8a'];

// Aviso de medalla nueva (25-11-2026): celebra cada medalla recién ganada, una a la vez. Al cerrar, todas quedan vistas
// y el aviso no vuelve a aparecer.
export default function MedallaNueva({ medallas, onCerrar }) {
  const [indice, setIndice] = useState(0);
  const medalla = medallas[indice];
  const quedan = medallas.length - indice - 1;
  const siguiente = () => (quedan > 0 ? setIndice(indice + 1) : onCerrar());
  return (
    <Dialogo titulo={medalla.nombre} tono="logro" onCerrar={onCerrar}>
      <div className="medalla-nueva">
        <div className="medalla-nueva__rayos" aria-hidden="true" />
        <div className="medalla-nueva__confeti" aria-hidden="true">
          {Array.from({ length: 24 }, (_, k) => (
            <i key={k} style={{ left: `${(k * 37) % 100}%`, top: `${(k * 53) % 48}%`, background: COLORES[k % 5], '--giro': `${k * 41}deg`, '--retraso': `${(k % 6) * 90}ms` }} />
          ))}
        </div>
        <div className="medalla-nueva__medalla"><Medalla nivel={medalla.nivel} icono={medalla.icono} color={medalla.color ?? '#1565a0'} tamano={150} /></div>
        <p className="medalla-nueva__sup">Nueva medalla · {NOMBRE_NIVEL[medalla.nivel] ?? medalla.nivel}</p>
        <p className="medalla-nueva__desc">{medalla.descripcion}</p>
        <p className="medalla-nueva__puntos"><strong>+{formatearNumero(medalla.puntos)}</strong> puntos</p>
        <div className="medalla-nueva__acciones">
          <button type="button" className="boton boton--principal" onClick={siguiente}>
            {quedan > 0 ? `Ver la siguiente (${quedan} más)` : '¡Genial!'}
          </button>
        </div>
      </div>
    </Dialogo>
  );
}

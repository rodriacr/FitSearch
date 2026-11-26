import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Icono from '../Icono.jsx';
import { obtenerRacha } from '../../services/comidas.service.js';
import { formatearNumero } from '../../services/formato.js';
import './RachaComidas.css';

// Hitos que se celebran con un mensaje propio; el resto de los días muestra el aviso habitual.
const HITOS = { 3: 'Tres días seguidos: ya es un hábito en camino.', 7: '¡Una semana completa registrando!', 14: '¡Dos semanas seguidas!', 30: '¡Un mes completo cuidando tu alimentación!' };

function mensajeDe({ dias, registradoHoy }) {
  if (dias === 0) return 'Registra una comida hoy para empezar tu racha.';
  if (!registradoHoy) return 'Registra una comida hoy para mantenerla.';
  return HITOS[dias] ?? 'Ya registraste hoy. ¡Sigue así!';
}

// Racha de registro en la tarjeta de progreso del Inicio (25-11-2026): días seguidos, hasta hoy, con al menos una
// comida registrada. Es un complemento: si la API falla o responde otra cosa, la fila no se muestra.
export default function RachaComidas() {
  const [racha, setRacha] = useState(null);
  const [fallo, setFallo] = useState(false);

  useEffect(() => {
    let activo = true;
    obtenerRacha()
      .then((datos) => { if (activo) (Number.isInteger(datos?.dias) ? setRacha(datos) : setFallo(true)); })
      .catch(() => activo && setFallo(true));
    return () => { activo = false; };
  }, []);

  if (fallo) return null;
  const tope = racha && racha.dias >= racha.diasMaximos;
  const enRiesgo = racha && racha.dias > 0 && !racha.registradoHoy;
  return (
    <li className={`progreso__racha${enRiesgo ? ' progreso__racha--riesgo' : ''}`}>
      <span className={`progreso__icono progreso__icono--racha${racha?.dias ? ' progreso__icono--encendida' : ''}`}><Icono nombre="rayo" tamano={22} /></span>
      <div aria-live="polite">
        <span className="progreso__nombre">Racha de comidas</span>
        <strong className="progreso__valor">
          {racha ? <>{formatearNumero(racha.dias)}{tope ? '+' : ''}<small> {racha.dias === 1 ? 'día seguido' : 'días seguidos'}</small></>
            : <span aria-hidden="true">—</span>}
        </strong>
        {racha && <span className="racha__mensaje">{mensajeDe(racha)}</span>}
        {racha && !racha.registradoHoy && <Link to="/comidas" className="progreso__enlace">Registrar comida</Link>}
      </div>
    </li>
  );
}

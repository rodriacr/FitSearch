import { evaluarContrasena } from '../services/contrasena.js';
import Icono from './Icono.jsx';

const NOMBRES = { debil: 'débil', media: 'media', fuerte: 'fuerte' };

export default function IndicadorContrasena({ password }) {
  if (!password) return null;
  const { requisitos, nivel } = evaluarContrasena(password);
  return (
    <div className={`fortaleza fortaleza--${nivel}`} aria-live="polite">
      <div className="fortaleza__barras" aria-hidden="true"><span /><span /><span /></div>
      <p className="fortaleza__nivel">Seguridad: {NOMBRES[nivel]}</p>
      <ul className="fortaleza__requisitos">
        {requisitos.map(({ clave, texto, cumple }) => (
          <li key={clave} className={cumple ? 'cumple' : undefined}>
            <Icono nombre={cumple ? 'check' : 'info'} tamano={14} />
            <span>{texto}<span className="solo-lector">{cumple ? ': cumple' : ': pendiente'}</span></span>
          </li>
        ))}
      </ul>
    </div>
  );
}

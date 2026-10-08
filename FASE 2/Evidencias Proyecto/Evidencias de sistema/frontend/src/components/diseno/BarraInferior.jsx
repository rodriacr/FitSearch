import { NavLink } from 'react-router-dom';
import Icono from '../Icono.jsx';
import { ESPACIOS } from './secciones.js';

// Navegación inferior en celular y tableta (en escritorio la reemplaza el menú lateral).
export default function BarraInferior({ espacio = 'usuario' }) {
  const { secciones, barra } = ESPACIOS[espacio];
  return (
    <nav className="barra-inferior" aria-label="Navegación inferior">
      {barra.map(({ seccion, nombre, icono }) => (
        <NavLink key={seccion} to={secciones[seccion].ruta} className="barra-inferior__enlace">
          <Icono nombre={icono} tamano={22} />
          <span>{nombre}</span>
        </NavLink>
      ))}
    </nav>
  );
}

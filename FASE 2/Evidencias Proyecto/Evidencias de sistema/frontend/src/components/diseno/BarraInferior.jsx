import { NavLink } from 'react-router-dom';
import Icono from '../Icono.jsx';
import { BARRA_INFERIOR, SECCIONES } from './secciones.js';

// Navegación inferior en celular y tableta (en escritorio la reemplaza el menú lateral).
export default function BarraInferior() {
  return (
    <nav className="barra-inferior" aria-label="Navegación inferior">
      {BARRA_INFERIOR.map(({ seccion, nombre, icono }) => (
        <NavLink key={seccion} to={SECCIONES[seccion].ruta} className="barra-inferior__enlace">
          <Icono nombre={icono} tamano={22} />
          <span>{nombre}</span>
        </NavLink>
      ))}
    </nav>
  );
}

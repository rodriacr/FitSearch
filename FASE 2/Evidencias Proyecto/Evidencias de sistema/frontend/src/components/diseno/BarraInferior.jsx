import { NavLink } from 'react-router-dom';
import Icono from '../Icono.jsx';
import { ESPACIOS } from './secciones.js';

// Navegación inferior en celular y tableta (en escritorio la reemplaza el menú lateral). Desde el 18-11-2026 muestra solo
// los íconos: la sección actual tiene el ícono relleno y el nombre queda para lectores de pantalla.
export default function BarraInferior({ espacio = 'usuario' }) {
  const { secciones, barra } = ESPACIOS[espacio];
  return (
    <nav className="barra-inferior" aria-label="Navegación inferior">
      {barra.map(({ seccion, nombre, icono }) => (
        <NavLink key={seccion} to={secciones[seccion].ruta} className="barra-inferior__enlace">
          {({ isActive }) => (
            <>
              <Icono nombre={icono} tamano={24} activo={isActive} />
              <span className="barra-inferior__texto">{nombre}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

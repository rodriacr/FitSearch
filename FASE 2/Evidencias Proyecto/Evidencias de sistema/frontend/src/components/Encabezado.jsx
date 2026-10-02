import { Link, NavLink } from 'react-router-dom';
import { useSesion } from '../context/SesionContext.jsx';
import Icono from './Icono.jsx';
import { Logo } from './PantallaAcceso.jsx';

export default function Encabezado() {
  const { sesion, cerrarSesion } = useSesion();

  return (
    <header className="encabezado">
      <Link to="/perfil" className="encabezado__marca" aria-label="FitSearch, ir a mi perfil"><Logo /></Link>
      <NavLink to="/profesionales" className="encabezado__directorio">
        <Icono nombre="buscar" tamano={19} />
        <span>Buscar profesionales</span>
      </NavLink>
      {sesion && (
        <nav className="encabezado__nav" aria-label="Sesión">
          <span className="avatar" aria-hidden="true">{sesion.usuario.nombre.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('')}</span>
          <span className="encabezado__usuario">{sesion.usuario.nombre}</span>
          <button type="button" className="boton boton--secundario" onClick={cerrarSesion}>
            <Icono nombre="salir" tamano={18} /> <span className="encabezado__texto-salir">Cerrar sesión</span>
          </button>
        </nav>
      )}
    </header>
  );
}

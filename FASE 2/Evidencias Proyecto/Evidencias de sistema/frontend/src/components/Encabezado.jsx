import { Link, useNavigate } from 'react-router-dom';
import { useSesion } from '../context/SesionContext.jsx';

export default function Encabezado() {
  const { sesion, cerrarSesion } = useSesion();
  const navegar = useNavigate();

  const salir = async () => {
    await cerrarSesion();
    navegar('/iniciar-sesion', { replace: true });
  };

  return (
    <header className="encabezado">
      <Link to="/" className="encabezado__marca">FitSearch</Link>
      {sesion && (
        <nav className="encabezado__nav" aria-label="Sesión">
          <span className="encabezado__usuario">{sesion.usuario.nombre}</span>
          <button type="button" className="boton boton--secundario" onClick={salir}>Cerrar sesión</button>
        </nav>
      )}
    </header>
  );
}

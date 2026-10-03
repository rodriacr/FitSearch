import { Link } from 'react-router-dom';
import { useSesion } from '../../context/SesionContext.jsx';
import { iniciales, primerNombre } from '../../services/formato.js';
import Icono from '../Icono.jsx';
import useDesplegable from './useDesplegable.js';

// "Hola, {nombre}" y el avatar abren el menú de la cuenta: Mi perfil y Cerrar sesión.
// No hay pantalla de configuración todavía, por eso no se ofrece.
export default function MenuUsuario() {
  const { sesion, cerrarSesion } = useSesion();
  const { abierto, setAbierto, contenedor, boton } = useDesplegable();
  const { nombre, correo } = sesion.usuario;
  const saludo = `Hola, ${primerNombre(nombre)}`;

  return (
    <div className="desplegable menu-usuario" ref={contenedor}>
      <button ref={boton} type="button" className="menu-usuario__boton" aria-expanded={abierto} aria-controls="menu-cuenta"
        aria-label={`${saludo}: menú de tu cuenta`} onClick={() => setAbierto(!abierto)}>
        <span className="avatar" aria-hidden="true">{iniciales(nombre)}</span>
        <span className="menu-usuario__saludo" aria-hidden="true">{saludo}</span>
        <Icono nombre="chevron" tamano={16} className="menu-usuario__flecha" />
      </button>
      {abierto && (
        <div id="menu-cuenta" className="desplegable__panel menu-usuario__panel">
          <p className="menu-usuario__identidad"><strong>{nombre}</strong><span>{correo}</span></p>
          <Link to="/perfil" className="desplegable__opcion" onClick={() => setAbierto(false)}>
            <Icono nombre="usuario" tamano={18} /> Mi perfil
          </Link>
          <button type="button" className="desplegable__opcion" onClick={cerrarSesion}>
            <Icono nombre="salir" tamano={18} /> Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );
}

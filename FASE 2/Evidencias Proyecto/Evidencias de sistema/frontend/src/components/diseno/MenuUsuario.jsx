import { Link } from 'react-router-dom';
import { useSesion } from '../../context/SesionContext.jsx';
import { iniciales, primerNombre } from '../../services/formato.js';
import Icono from '../Icono.jsx';
import useDesplegable from './useDesplegable.js';

// "Hola, {nombre}" y el avatar abren el menú de la cuenta: su perfil (el del usuario o el profesional) y Cerrar sesión.
// No hay pantalla de configuración todavía, por eso no se ofrece. El administrador no tiene perfil propio: su menú dice
// que la cuenta es de administrador (11-11-2026).
export default function MenuUsuario() {
  const { sesion, cerrarSesion } = useSesion();
  const { abierto, setAbierto, contenedor, boton } = useDesplegable();
  const { nombre, correo, rol } = sesion.usuario;
  const administrador = rol === 'administrador';
  const perfil = rol === 'profesional' ? { ruta: '/profesional/perfil', nombre: 'Perfil profesional' } : { ruta: '/perfil', nombre: 'Mi perfil' };
  const saludo = `Hola, ${primerNombre(nombre)}`;

  return (
    <div className="desplegable menu-usuario" ref={contenedor}>
      <button ref={boton} type="button" className="menu-usuario__boton" aria-expanded={abierto} aria-controls="menu-cuenta"
        aria-label={`${saludo}${administrador ? ' (administrador)' : ''}: menú de tu cuenta`} onClick={() => setAbierto(!abierto)}>
        <span className="avatar" aria-hidden="true">{iniciales(nombre)}</span>
        <span className="menu-usuario__saludo" aria-hidden="true">
          {saludo}
          {administrador && <small className="menu-usuario__rol">Administrador</small>}
        </span>
        <Icono nombre="chevron" tamano={16} className="menu-usuario__flecha" />
      </button>
      {abierto && (
        <div id="menu-cuenta" className="desplegable__panel menu-usuario__panel">
          <p className="menu-usuario__identidad">
            <strong>{nombre}</strong>
            {administrador && <span className="menu-usuario__etiqueta"><Icono nombre="escudo" tamano={14} /> Administrador</span>}
            <span>{correo}</span>
          </p>
          {!administrador && (
            <Link to={perfil.ruta} className="desplegable__opcion" onClick={() => setAbierto(false)}>
              <Icono nombre="usuario" tamano={18} /> {perfil.nombre}
            </Link>
          )}
          <button type="button" className="desplegable__opcion" onClick={cerrarSesion}>
            <Icono nombre="salir" tamano={18} /> Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );
}

import { Link } from 'react-router-dom';
import { useSesion } from '../context/SesionContext.jsx';
import { inicioDe } from '../services/navegacion.js';
import MenuUsuario from './diseno/MenuUsuario.jsx';
import Notificaciones from './diseno/Notificaciones.jsx';
import Icono from './Icono.jsx';
import MarcaFitSearch from './diseno/MarcaFitSearch.jsx';

// El logo lleva al Inicio de su rol con sesión y a la portada sin ella; nunca al perfil (DAS, D25).
// No hay acceso a Profesionales en el encabezado: ya están el menú lateral, la barra inferior y los accesos del Inicio.
export default function Encabezado({ menuAbierto = false, onAlternarMenu, soloMarca = false, mostrarNotificaciones = !soloMarca }) {
  const { sesion } = useSesion();

  return (
    <header className="encabezado">
      {onAlternarMenu && (
        <button type="button" className="boton-icono encabezado__menu" aria-label={menuAbierto ? 'Cerrar menú' : 'Abrir menú'}
          aria-expanded={menuAbierto} aria-controls="menu-principal" onClick={onAlternarMenu}>
          <Icono nombre={menuAbierto ? 'cerrar' : 'menu'} tamano={24} />
        </button>
      )}
      <Link to={sesion ? inicioDe(sesion.usuario) : '/'} className="encabezado__marca" aria-label={sesion ? 'FitSearch, ir al inicio' : 'FitSearch, ir a la portada'}>
        <MarcaFitSearch />
      </Link>
      {sesion && (!soloMarca || mostrarNotificaciones) && (
        <div className="encabezado__acciones">
          {mostrarNotificaciones && <Notificaciones />}
          {!soloMarca && <MenuUsuario />}
        </div>
      )}
    </header>
  );
}

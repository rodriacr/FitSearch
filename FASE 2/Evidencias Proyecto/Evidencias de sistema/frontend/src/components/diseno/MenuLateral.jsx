import { useEffect, useRef } from 'react';
import { Link, NavLink } from 'react-router-dom';
import Icono from '../Icono.jsx';
import MarcaFitSearch from './MarcaFitSearch.jsx';
import Notificaciones from './Notificaciones.jsx';
import MenuMas from './MenuMas.jsx';
import AvatarNavegacion from './AvatarNavegacion.jsx';
import { ESPACIOS } from './secciones.js';
import useBloquearScroll from './useBloquearScroll.js';
import useMenuDesplegable from './useMenuDesplegable.js';
import { inicioDe } from '../../services/navegacion.js';
import { useSesion } from '../../context/SesionContext.jsx';

export default function MenuLateral({ abierto, onCerrar, espacio = 'usuario', tema, onTema, mostrarNotificaciones = true }) {
  const { secciones, menu } = ESPACIOS[espacio];
  const { sesion } = useSesion();
  const { desplegado, propiedades } = useMenuDesplegable();
  const panel = useRef(null);
  const cerrar = useRef(null);
  useBloquearScroll(abierto);
  useEffect(() => {
    if (!abierto) return undefined;
    const anterior = document.activeElement;
    cerrar.current?.focus();
    const alTeclear = (evento) => {
      if (evento.key === 'Escape') {
        if (panel.current.querySelector('.notificaciones__boton[aria-expanded="true"], .menu-sesion > button[aria-expanded="true"]')) return;
        onCerrar(); return;
      }
      if (evento.key !== 'Tab') return;
      const candidatos = [...panel.current.querySelectorAll('a[href], button, input, select, textarea, [tabindex]')];
      const controles = candidatos.filter((control) => {
        if (control.disabled || control.tabIndex < 0 || control.closest('[hidden], [inert]')) return false;
        for (let actual = control; actual && actual !== panel.current; actual = actual.parentElement) {
          const estilo = getComputedStyle(actual);
          if (estilo.display === 'none' || estilo.visibility === 'hidden') return false;
        }
        if (control.type !== 'radio' || !control.name) return true;
        const grupo = candidatos.filter((otro) => otro.type === 'radio' && otro.name === control.name && !otro.disabled);
        return control === (grupo.find((otro) => otro.checked) || grupo[0]);
      });
      const primero = controles[0];
      const ultimo = controles.at(-1);
      const afuera = !panel.current.contains(document.activeElement);
      if (evento.shiftKey && (afuera || document.activeElement === primero)) { evento.preventDefault(); ultimo?.focus(); }
      else if (!evento.shiftKey && (afuera || document.activeElement === ultimo)) { evento.preventDefault(); primero?.focus(); }
    };
    document.addEventListener('keydown', alTeclear);
    return () => {
      document.removeEventListener('keydown', alTeclear);
      if (anterior?.isConnected) anterior.focus();
    };
  }, [abierto, onCerrar]);
  const menuOrdenado = menu.filter((clave) => clave !== 'perfil');
  const posicionPerfil = menuOrdenado.indexOf(espacio === 'profesional' ? 'reportes' : 'mensajes');
  if (menu.includes('perfil')) menuOrdenado.splice(posicionPerfil >= 0 ? posicionPerfil + 1 : menuOrdenado.length, 0, 'perfil');
  const posicionAvisos = menuOrdenado.indexOf('mensajes');
  return <>
    <div className={`menu-lateral__fondo${abierto ? ' menu-lateral__fondo--visible' : ''}`} onClick={onCerrar} aria-hidden="true" />
    <div ref={panel} role={abierto ? 'dialog' : undefined} aria-modal={abierto ? true : undefined} aria-label={abierto ? 'Navegación' : undefined} className={`navegacion-lateral${abierto ? ' navegacion-lateral--abierta' : ''}${desplegado ? ' navegacion-lateral--desplegada' : ''}`} {...propiedades}>
      <nav id="menu-principal" className={`menu-lateral${abierto ? ' menu-lateral--abierto' : ''}${desplegado ? ' menu-lateral--desplegado' : ''}`} aria-label="Menú principal">
        <div className="menu-lateral__cabecera">
          <Link to={inicioDe(sesion.usuario)} className="menu-lateral__marca" aria-label="FitSearch, ir al inicio desde el menú" onClick={onCerrar}><MarcaFitSearch /></Link>
          <button ref={cerrar} type="button" className="boton-icono" aria-label="Cerrar menú" onClick={onCerrar}><Icono nombre="cerrar" tamano={22} /></button>
        </div>
        <ul className="menu-lateral__lista">
          {menuOrdenado.map((clave, indice) => {
            const { ruta, nombre, icono, proximamente } = secciones[clave];
            return <li key={clave}>
              <NavLink to={ruta} className="menu-lateral__enlace" onClick={onCerrar}>
                {({ isActive }) => <>{clave === 'perfil' ? <AvatarNavegacion /> : <Icono nombre={icono} tamano={26} activo={isActive} />}
                  <span className="menu-lateral__texto">{nombre}</span>
                  {proximamente && <span className="etiqueta-proximamente">Próximamente</span>}
                </>}
              </NavLink>
              {mostrarNotificaciones && indice === posicionAvisos && <Notificaciones ubicacion="lateral" />}
            </li>;
          })}
          {mostrarNotificaciones && posicionAvisos === -1 && <li><Notificaciones ubicacion="lateral" /></li>}
        </ul>
      </nav>
      <MenuMas tema={tema} onTema={onTema} onNavegar={onCerrar} />
    </div>
  </>;
}

import { useEffect, useLayoutEffect, useRef } from 'react';
import { Link, NavLink } from 'react-router-dom';
import Icono from '../Icono.jsx';
import iconoLogo from '../../assets/logo-fitsearch-icono.png';
import MarcaFitSearch from './MarcaFitSearch.jsx';
import { ESPACIOS, SECCIONES } from './secciones.js';
import useBloquearScroll from './useBloquearScroll.js';
import useMenuDesplegable from './useMenuDesplegable.js';

// Menú lateral fijo en escritorio; en celular y tableta se abre como panel desde el botón de menú.
// Cada espacio (usuario, profesional o administrador) tiene sus propias secciones (DAS, D25). En escritorio con mouse
// queda siempre contraído a solo íconos y se despliega sobre el contenido al acercar el mouse o al recorrerlo con el
// teclado (18-11-2026; reemplaza al botón «Contraer menú» del 11-11-2026).
export default function MenuLateral({ abierto, onCerrar, espacio = 'usuario' }) {
  const { secciones, menu } = ESPACIOS[espacio];
  const { desplegado, propiedades } = useMenuDesplegable();
  const botonChat = useRef(null);
  const transferirFocoChat = useRef(false);
  useLayoutEffect(() => {
    // Shift+Tab puede entrar por el acceso compacto. Al desplegar el menú, ese enlace se oculta;
    // transferimos el foco al acceso visible antes de que el navegador lo pierda.
    if (desplegado && transferirFocoChat.current) {
      transferirFocoChat.current = false;
      botonChat.current?.focus({ preventScroll: true });
    }
  }, [desplegado]);
  useBloquearScroll(abierto);
  useEffect(() => {
    if (!abierto) return undefined;
    const alTeclear = (evento) => { if (evento.key === 'Escape') onCerrar(); };
    document.addEventListener('keydown', alTeclear);
    return () => document.removeEventListener('keydown', alTeclear);
  }, [abierto, onCerrar]);
  const rutaChat = `${SECCIONES.asistente.ruta}/nuevo?inicio=profesional`;

  return (
    <>
      {/* El fondo siempre está montado para fundirse junto con el panel (al abrir y al cerrar). */}
      <div className={`menu-lateral__fondo${abierto ? ' menu-lateral__fondo--visible' : ''}`} onClick={onCerrar} aria-hidden="true" />
      <nav id="menu-principal" className={`menu-lateral${abierto ? ' menu-lateral--abierto' : ''}${desplegado ? ' menu-lateral--desplegado' : ''}`}
        aria-label="Menú principal" {...propiedades}>
        <div className="menu-lateral__cabecera">
          <MarcaFitSearch />
          <button type="button" className="boton-icono" aria-label="Cerrar menú" onClick={onCerrar}><Icono nombre="cerrar" tamano={22} /></button>
        </div>
        <ul className="menu-lateral__lista">
          {menu.map((clave) => {
            const { ruta, nombre, icono, proximamente } = secciones[clave];
            return (
              <li key={clave}>
                {/* La sección actual se reconoce por el ícono relleno (18-11-2026), sin recuadro de fondo. */}
                <NavLink to={ruta} className="menu-lateral__enlace">
                  {({ isActive }) => (
                    <>
                      <Icono nombre={icono} tamano={20} activo={isActive} />
                      <span className="menu-lateral__texto">{nombre}</span>
                      {proximamente && <span className="etiqueta-proximamente" title="Próximamente">Próximamente</span>}
                    </>
                  )}
                </NavLink>
              </li>
            );
          })}
        </ul>
        {espacio !== 'usuario' ? (
          <div className="menu-lateral__lema">
            <img src={iconoLogo} alt="" aria-hidden="true" />
            <p>Mejores decisiones, mejores resultados.</p>
          </div>
        ) : (
          <>
            <div className="tarjeta-recomendacion">
              <span className="tarjeta-recomendacion__icono"><Icono nombre="chispa" tamano={22} /></span>
              <p className="tarjeta-recomendacion__titulo">¿Necesitas una recomendación?</p>
              <p className="tarjeta-recomendacion__texto">Pregunta a nuestro asistente IA y encuentra el profesional ideal para ti.</p>
              <Link ref={botonChat} to={rutaChat} className="tarjeta-recomendacion__boton">Abrir chat <Icono nombre="flecha" tamano={16} /></Link>
            </div>
            {/* Con el menú contraído, la tarjeta se reduce a este acceso al chat. El CSS muestra uno u otro: en celular
                y al desplegarse, la tarjeta. */}
            <Link to={rutaChat} className="menu-lateral__chat" aria-label="Abrir chat con el asistente IA"
              onFocus={() => { transferirFocoChat.current = true; }}>
              <Icono nombre="chispa" tamano={20} />
            </Link>
          </>
        )}
      </nav>
    </>
  );
}

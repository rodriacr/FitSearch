import { useEffect } from 'react';
import { Link, NavLink } from 'react-router-dom';
import Icono from '../Icono.jsx';
import iconoLogo from '../../assets/logo-fitsearch-icono.png';
import { Logo } from '../PantallaAcceso.jsx';
import { ESPACIOS, SECCIONES } from './secciones.js';

// Menú lateral fijo en escritorio; en celular y tableta se abre como panel desde el botón de menú.
// Cada espacio (usuario o profesional) tiene sus propias secciones (DAS, D25).
export default function MenuLateral({ abierto, onCerrar, espacio = 'usuario' }) {
  const { secciones, menu } = ESPACIOS[espacio];
  useEffect(() => {
    if (!abierto) return undefined;
    const alTeclear = (evento) => { if (evento.key === 'Escape') onCerrar(); };
    document.addEventListener('keydown', alTeclear);
    return () => document.removeEventListener('keydown', alTeclear);
  }, [abierto, onCerrar]);

  return (
    <>
      {abierto && <div className="menu-lateral__fondo" onClick={onCerrar} aria-hidden="true" />}
      <nav id="menu-principal" className={`menu-lateral${abierto ? ' menu-lateral--abierto' : ''}`} aria-label="Menú principal">
        <div className="menu-lateral__cabecera">
          <Logo />
          <button type="button" className="boton-icono" aria-label="Cerrar menú" onClick={onCerrar}><Icono nombre="cerrar" tamano={22} /></button>
        </div>
        <ul className="menu-lateral__lista">
          {menu.map((clave) => {
            const { ruta, nombre, icono, proximamente } = secciones[clave];
            return (
              <li key={clave}>
                <NavLink to={ruta} className="menu-lateral__enlace">
                  <Icono nombre={icono} tamano={20} />
                  <span>{nombre}</span>
                  {proximamente && <span className="etiqueta-proximamente" title="Próximamente">Próximamente</span>}
                </NavLink>
              </li>
            );
          })}
        </ul>
        {espacio === 'profesional' ? (
          <div className="menu-lateral__lema">
            <img src={iconoLogo} alt="" aria-hidden="true" />
            <p>Mejores decisiones, mejores resultados.</p>
          </div>
        ) : (
          <div className="tarjeta-recomendacion">
            <span className="tarjeta-recomendacion__icono"><Icono nombre="chispa" tamano={22} /></span>
            <p className="tarjeta-recomendacion__titulo">¿Necesitas una recomendación?</p>
            <p className="tarjeta-recomendacion__texto">Pregunta a nuestro asistente IA y encuentra el profesional ideal para ti.</p>
            <Link to={SECCIONES.asistente.ruta} className="tarjeta-recomendacion__boton">Abrir chat <Icono nombre="flecha" tamano={16} /></Link>
            <span className="etiqueta-proximamente etiqueta-proximamente--clara">Próximamente</span>
          </div>
        )}
      </nav>
    </>
  );
}

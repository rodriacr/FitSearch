import { useEffect } from 'react';
import { Link, NavLink } from 'react-router-dom';
import Icono from '../Icono.jsx';
import iconoLogo from '../../assets/logo-fitsearch-icono.png';
import MarcaFitSearch from './MarcaFitSearch.jsx';
import { ESPACIOS, SECCIONES } from './secciones.js';
import useBloquearScroll from './useBloquearScroll.js';
import useEtiquetaFlotante from './useEtiquetaFlotante.jsx';

// Desde este ancho el menú es una columna fija y se puede compactar; más angosto se abre completo como panel.
const ESCRITORIO = '(min-width: 64rem)';
const TEXTO_CHAT = 'Abrir chat con el asistente IA';

// Menú lateral fijo en escritorio; en celular y tableta se abre como panel desde el botón de menú.
// Cada espacio (usuario o profesional) tiene sus propias secciones (DAS, D25). En escritorio se puede compactar para
// ver solo los íconos (11-11-2026): el nombre aparece al pasar el mouse o al enfocar cada opción.
export default function MenuLateral({ abierto, onCerrar, espacio = 'usuario', compacto = false, onAlternarCompacto }) {
  const { secciones, menu } = ESPACIOS[espacio];
  const { nodo: etiqueta, propiedades, ocultar } = useEtiquetaFlotante(compacto, ESCRITORIO);
  useBloquearScroll(abierto);
  useEffect(() => {
    if (!abierto) return undefined;
    const alTeclear = (evento) => { if (evento.key === 'Escape') onCerrar(); };
    document.addEventListener('keydown', alTeclear);
    return () => document.removeEventListener('keydown', alTeclear);
  }, [abierto, onCerrar]);
  const rutaChat = `${SECCIONES.asistente.ruta}/nuevo?inicio=profesional`;
  const textoAlternar = compacto ? 'Expandir menú' : 'Contraer menú';

  return (
    <>
      {/* El fondo siempre está montado para fundirse junto con el panel (al abrir y al cerrar). */}
      <div className={`menu-lateral__fondo${abierto ? ' menu-lateral__fondo--visible' : ''}`} onClick={onCerrar} aria-hidden="true" />
      <nav id="menu-principal" className={`menu-lateral${abierto ? ' menu-lateral--abierto' : ''}${compacto ? ' menu-lateral--compacto' : ''}`}
        aria-label="Menú principal" onScroll={ocultar}>
        <div className="menu-lateral__cabecera">
          <MarcaFitSearch />
          <button type="button" className="boton-icono" aria-label="Cerrar menú" onClick={onCerrar}><Icono nombre="cerrar" tamano={22} /></button>
        </div>
        {onAlternarCompacto && (
          <button type="button" className="menu-lateral__compactar" onClick={() => { ocultar(); onAlternarCompacto(); }} {...propiedades(textoAlternar)}>
            <Icono nombre={compacto ? 'expandir' : 'contraer'} tamano={20} />
            <span className="menu-lateral__texto">{textoAlternar}</span>
          </button>
        )}
        <ul className="menu-lateral__lista">
          {menu.map((clave) => {
            const { ruta, nombre, icono, proximamente } = secciones[clave];
            return (
              <li key={clave}>
                <NavLink to={ruta} className="menu-lateral__enlace" {...propiedades(nombre)}>
                  <Icono nombre={icono} tamano={20} />
                  <span className="menu-lateral__texto">{nombre}</span>
                  {proximamente && <span className="etiqueta-proximamente" title="Próximamente">Próximamente</span>}
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
              <Link to={rutaChat} className="tarjeta-recomendacion__boton">Abrir chat <Icono nombre="flecha" tamano={16} /></Link>
            </div>
            {/* Con el menú compacto, la tarjeta se reduce a este acceso al chat. En celular el menú se abre completo:
                ahí el CSS muestra la tarjeta y oculta este acceso. */}
            {compacto && (
              <Link to={rutaChat} className="menu-lateral__chat" aria-label={TEXTO_CHAT} {...propiedades(TEXTO_CHAT)}>
                <Icono nombre="chispa" tamano={20} />
              </Link>
            )}
          </>
        )}
        {etiqueta}
      </nav>
    </>
  );
}

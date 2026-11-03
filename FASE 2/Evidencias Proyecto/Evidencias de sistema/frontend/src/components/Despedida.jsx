import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import iconoLogo from '../assets/logo-fitsearch-icono.png';
import './Despedida.css';

// Se muestra en la portada justo después de cerrar sesión. "Seguir en la portada" o Escape la cierran.
export default function Despedida({ nombre, texto, onCerrar }) {
  const dialogo = useRef(null);
  const principal = useRef(null);
  useEffect(() => {
    // Mientras está abierta, el resto de la portada queda inerte: con Tab no se sale del diálogo y el lector de
    // pantalla no lee lo de atrás. Al cerrarla, el foco vuelve al contenido de la portada en vez de quedar en el body.
    const fondo = [...(dialogo.current?.parentElement?.children ?? [])]
      .filter((elemento) => elemento !== dialogo.current && !elemento.hasAttribute('inert'));
    fondo.forEach((elemento) => elemento.setAttribute('inert', ''));
    principal.current?.focus();
    const alPresionar = (evento) => { if (evento.key === 'Escape') onCerrar(); };
    document.addEventListener('keydown', alPresionar);
    return () => {
      document.removeEventListener('keydown', alPresionar);
      fondo.forEach((elemento) => elemento.removeAttribute('inert'));
      document.getElementById('contenido')?.focus();
    };
  }, [onCerrar]);

  return (
    <div ref={dialogo} className="despedida" role="dialog" aria-modal="true" aria-labelledby="titulo-despedida" aria-describedby="texto-despedida">
      <div className="despedida__tarjeta">
        <div className="despedida__marca" aria-hidden="true">
          <span className="despedida__logo"><img src={iconoLogo} alt="" /></span>
        </div>
        <div className="despedida__contenido">
          <h2 id="titulo-despedida">{nombre ? `Hasta pronto, ${nombre}` : 'Hasta pronto'}</h2>
          <p id="texto-despedida"><span>{texto}</span> Tus favoritos, citas y perfil te esperan cuando vuelvas.</p>
          <Link ref={principal} to="/iniciar-sesion" className="boton boton--principal">Volver a iniciar sesión</Link>
          <button type="button" className="boton boton--secundario despedida__seguir" onClick={onCerrar}>Seguir en la portada</button>
          <p className="despedida__nota">Si usas un equipo compartido, cierra también el navegador.</p>
        </div>
      </div>
    </div>
  );
}

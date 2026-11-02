import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import fotoUsuario from '../assets/perfil-usuario.webp';
import Icono from './Icono.jsx';
import './Despedida.css';

// Se muestra en la portada justo después de cerrar sesión. "Seguir en la portada" o Escape la cierran.
export default function Despedida({ nombre, texto, onCerrar }) {
  const principal = useRef(null);
  useEffect(() => {
    principal.current?.focus();
    const alPresionar = (evento) => { if (evento.key === 'Escape') onCerrar(); };
    document.addEventListener('keydown', alPresionar);
    return () => document.removeEventListener('keydown', alPresionar);
  }, [onCerrar]);

  return (
    <div className="despedida" role="dialog" aria-modal="true" aria-labelledby="titulo-despedida" aria-describedby="texto-despedida">
      <div className="despedida__tarjeta">
        <div className="despedida__foto">
          <img src={fotoUsuario} alt="" />
          <span className="despedida__check" aria-hidden="true"><Icono nombre="check" tamano={26} /></span>
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

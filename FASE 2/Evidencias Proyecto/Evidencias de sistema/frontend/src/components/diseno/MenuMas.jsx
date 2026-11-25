import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useSesion } from '../../context/SesionContext.jsx';
import Icono from '../Icono.jsx';
import useDesplegable from './useDesplegable.js';
import { SECCIONES } from './secciones.js';
import { TEMAS } from './temas.js';

export default function MenuMas({ tema, onTema, onNavegar }) {
  const { sesion, cerrarSesion } = useSesion();
  const { abierto, setAbierto, contenedor, boton } = useDesplegable();
  const [aspecto, setAspecto] = useState(false);
  const { rol } = sesion.usuario;
  const configuracion = rol === 'profesional' ? '/profesional/configuracion' : rol === 'administrador' ? '/admin/dashboard' : SECCIONES.configuracion.ruta;
  const favoritos = SECCIONES.favoritos;
  const ir = () => { setAbierto(false); onNavegar?.(); };
  return <nav ref={contenedor} className="menu-sesion" aria-label="Cuenta">
    <button ref={boton} type="button" aria-label="Más opciones" aria-expanded={abierto} aria-controls="menu-mas"
      onClick={() => { setAbierto(!abierto); setAspecto(false); }}>
      <Icono nombre="menu" tamano={28} /><span className="menu-lateral__texto">Más</span>
    </button>
    {abierto && <div id="menu-mas" className="menu-mas__panel">
      {aspecto ? <>
        <button type="button" onClick={() => setAspecto(false)}><Icono nombre="flechaIzquierda" tamano={18} />Cambiar aspecto</button>
        <fieldset className="menu-mas__temas"><legend className="solo-lector">Tema de la aplicación</legend>
          {TEMAS.map(({ valor, nombre }) => <label key={valor}><span>{nombre}</span>
            <input type="radio" name="aspecto" value={valor} checked={tema === valor} onChange={() => onTema(valor)} /></label>)}
        </fieldset>
      </> : <>
        {rol === 'usuario' && <NavLink to={favoritos.ruta} onClick={ir}>
          {({ isActive }) => <><Icono nombre={favoritos.icono} tamano={20} activo={isActive} />{favoritos.nombre}</>}
        </NavLink>}
        <NavLink to={configuracion} onClick={ir}><Icono nombre="ajustes" tamano={20} />Configuración</NavLink>
        <button type="button" onClick={() => setAspecto(true)}><Icono nombre="luna" tamano={20} />Cambiar aspecto</button>
        <hr />
        <button type="button" onClick={cerrarSesion}><Icono nombre="salir" tamano={21} />Cerrar sesión</button>
      </>}
    </div>}
  </nav>;
}

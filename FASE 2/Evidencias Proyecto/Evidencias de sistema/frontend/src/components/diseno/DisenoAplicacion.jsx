import { useCallback, useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigationType } from 'react-router-dom';
import { useSesion } from '../../context/SesionContext.jsx';
import Alerta from '../Alerta.jsx';
import Encabezado from '../Encabezado.jsx';
import BarraInferior from './BarraInferior.jsx';
import MenuLateral from './MenuLateral.jsx';
import './DisenoAplicacion.css';

// Estructura común de las pantallas con sesión: encabezado, menú lateral, contenido y barra inferior (DAS, D22).
export default function DisenoAplicacion() {
  const { aviso: avisoSesion, limpiarAviso } = useSesion();
  const { pathname } = useLocation();
  const tipoNavegacion = useNavigationType();
  const [menuAbierto, setMenuAbierto] = useState(false);
  // El aviso de sesión iniciada o de cuenta creada se muestra una vez, en la primera pantalla.
  const [aviso, setAviso] = useState(avisoSesion);
  const [rutaActual, setRutaActual] = useState(pathname);
  if (rutaActual !== pathname) {
    // Al cambiar de pantalla se cierra el menú del celular y se descarta el aviso, salvo en una redirección
    // automática (por ejemplo, del Inicio al asistente de perfil), para que el aviso alcance a verse.
    setRutaActual(pathname);
    setMenuAbierto(false);
    if (tipoNavegacion !== 'REPLACE') setAviso(null);
  }
  useEffect(() => {
    if (avisoSesion) limpiarAviso();
  }, [avisoSesion, limpiarAviso]);
  const cerrarMenu = useCallback(() => setMenuAbierto(false), []);

  return (
    <div className="app">
      <a className="app__saltar" href="#contenido">Saltar al contenido</a>
      <Encabezado menuAbierto={menuAbierto} onAlternarMenu={() => setMenuAbierto(!menuAbierto)} />
      <div className="app__cuerpo">
        <MenuLateral abierto={menuAbierto} onCerrar={cerrarMenu} />
        <main id="contenido" className="app__contenido" tabIndex={-1}>
          {aviso && <Alerta tipo={aviso.tipo}>{aviso.texto}</Alerta>}
          {/* Las pantallas pueden descartar el aviso cuando la persona avanza (por ejemplo, en el asistente de perfil). */}
          <Outlet context={{ descartarAviso: () => setAviso(null) }} />
        </main>
      </div>
      <BarraInferior />
    </div>
  );
}

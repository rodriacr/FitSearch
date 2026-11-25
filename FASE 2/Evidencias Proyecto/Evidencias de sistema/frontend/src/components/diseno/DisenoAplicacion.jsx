import { Suspense, useCallback, useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigationType } from 'react-router-dom';
import { useSesion } from '../../context/SesionContext.jsx';
import AvisosMensajesProvider from '../../context/AvisosMensajesProvider.jsx';
import Alerta from '../Alerta.jsx';
import Bienvenida from '../Bienvenida.jsx';
import Encabezado from '../Encabezado.jsx';
import BarraInferior from './BarraInferior.jsx';
import MenuLateral from './MenuLateral.jsx';
import MensajesFlotantes from './MensajesFlotantes.jsx';
import { TEMAS } from './temas.js';
import './DisenoAplicacion.css';
import './EstiloCristal.css';
import './NavegacionCompacta.css';
import './TemaAplicacion.css';

const ANCHO_ESCRITORIO = '(min-width: 64rem)';
const esEscritorio = (consulta) => consulta?.matches ?? (window.innerWidth >= 1024);

// Estructura común de las pantallas con sesión: encabezado, menú lateral, contenido y barra inferior (DAS, D22).
// "espacio" elige el menú del usuario o el del profesional (DAS, D25).
export default function DisenoAplicacion(props) {
  return <AvisosMensajesProvider><ContenidoAplicacion {...props} /></AvisosMensajesProvider>;
}

function ContenidoAplicacion({ espacio = 'usuario' }) {
  const { sesion, aviso: avisoSesion, limpiarAviso } = useSesion();
  const { pathname } = useLocation();
  const tipoNavegacion = useNavigationType();
  const [preferenciaTema, setPreferenciaTema] = useState(() => {
    try {
      const guardada = localStorage.getItem('fitsearch_aspecto');
      return TEMAS.some(({ valor }) => valor === guardada) ? guardada : 'claro';
    } catch { return 'claro'; }
  });
  const [sistemaOscuro, setSistemaOscuro] = useState(() => window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false);
  const tema = preferenciaTema === 'sistema' ? (sistemaOscuro ? 'oscuro' : 'claro') : preferenciaTema;
  const cambiarTema = (valor) => { setPreferenciaTema(valor); try { localStorage.setItem('fitsearch_aspecto', valor); } catch { /* El tema sigue funcionando sin almacenamiento. */ } };
  useEffect(() => {
    const contraste = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!contraste) return;
    const cambiar = (e) => setSistemaOscuro(e.matches);
    contraste.addEventListener?.('change', cambiar);
    return () => contraste.removeEventListener?.('change', cambiar);
  }, []);
  useEffect(() => {
    document.documentElement.dataset.tema = tema;
    return () => { delete document.documentElement.dataset.tema; };
  }, [tema]);
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [escritorio, setEscritorio] = useState(() => esEscritorio(window.matchMedia?.(ANCHO_ESCRITORIO)));
  useEffect(() => {
    const consulta = window.matchMedia?.(ANCHO_ESCRITORIO);
    const ajustar = () => {
      const amplio = esEscritorio(consulta);
      setEscritorio(amplio);
      if (amplio) setMenuAbierto(false);
    };
    const destino = consulta?.addEventListener ? consulta : window;
    const evento = destino === window ? 'resize' : 'change';
    destino.addEventListener(evento, ajustar);
    return () => destino.removeEventListener(evento, ajustar);
  }, []);
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
  const cerrarBienvenida = useCallback(() => setAviso(null), []);
  const esBienvenida = aviso?.origen === 'ingreso' && ['usuario', 'profesional'].includes(sesion?.usuario.rol);

  return (
    <div className={`app app--${espacio}${tema === 'oscuro' ? ' app--oscuro' : ''}${menuAbierto ? ' app--menu-abierto' : ''}`}>
      <a className="app__saltar" href="#contenido">Saltar al contenido</a>
      <Encabezado soloMarca mostrarNotificaciones={!escritorio} menuAbierto={menuAbierto} onAlternarMenu={() => setMenuAbierto(!menuAbierto)} />
      <div className="app__cuerpo">
        <MenuLateral abierto={menuAbierto} onCerrar={cerrarMenu} espacio={espacio} tema={preferenciaTema} onTema={cambiarTema} mostrarNotificaciones={escritorio} />
        <main id="contenido" className="app__contenido" tabIndex={-1}>
          {aviso && !esBienvenida && <Alerta flotante={false} tipo={aviso.tipo}>{aviso.texto}</Alerta>}
          {/* Las pantallas pueden descartar el aviso cuando la persona avanza (por ejemplo, en el asistente de perfil). */}
          <Suspense fallback={<p className="app__cargando texto-secundario" role="status">Cargando pantalla…</p>}>
            <Outlet context={{ descartarAviso: () => setAviso(null), preferenciaTema, cambiarTema }} />
          </Suspense>
        </main>
      </div>
      <BarraInferior espacio={espacio} />
      {espacio !== 'administrador' && <MensajesFlotantes />}
      {esBienvenida && <Bienvenida usuario={sesion.usuario} onCerrar={cerrarBienvenida} />}
    </div>
  );
}

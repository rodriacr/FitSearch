import { lazy, Suspense, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useSesion } from '../../context/SesionContext.jsx';
import useAvisosMensajes from '../../services/useAvisosMensajes.js';
import BotonMensajesFlotantes from './BotonMensajesFlotantes.jsx';
const VentanaMensajes = lazy(() => import('./VentanaMensajes.jsx'));
export default function MensajesFlotantes() {
  const { pathname } = useLocation();
  const { sesion } = useSesion();
  const { total } = useAvisosMensajes();
  const [iniciado, setIniciado] = useState(false);
  const base = sesion.usuario.rol === 'profesional' ? '/profesional/mensajes' : '/mensajes';
  if (pathname === base || pathname.startsWith(base + '/')) return null;
  return iniciado ? <Suspense fallback={<p className="solo-lector" role="status">Abriendo mensajes…</p>}><VentanaMensajes /></Suspense> : (
    <aside className="mensajes-flotantes mensajes-flotantes--minimizado" aria-label="Mensajes flotantes">
      <BotonMensajesFlotantes total={total} onAbrir={() => setIniciado(true)} />
    </aside>
  );
}

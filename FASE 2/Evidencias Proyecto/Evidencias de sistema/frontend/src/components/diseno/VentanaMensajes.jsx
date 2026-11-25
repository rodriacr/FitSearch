import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useSesion } from '../../context/SesionContext.jsx';
import { Bandeja, ChatAbierto, useConsultaPeriodica } from '../../pages/Mensajes.jsx';
import Alerta from '../Alerta.jsx';
import useAvisosMensajes from '../../services/useAvisosMensajes.js';
import Icono from '../Icono.jsx';
import BotonMensajesFlotantes from './BotonMensajesFlotantes.jsx';

export default function MensajesFlotantes() {
  const { sesion } = useSesion();
  const { pathname } = useLocation();
  const profesional = sesion.usuario.rol === 'profesional';
  const base = profesional ? '/profesional/mensajes' : '/mensajes';
  const [modo, setModo] = useState('compacto');
  const [chatId, setChatId] = useState(null);
  const [revision, setRevision] = useState(0);
  const boton = useRef(null);
  const panel = useRef(null);
  const devolverFoco = useRef(false);
  const enPagina = pathname === base || pathname.startsWith(`${base}/`);
  const visible = modo !== 'minimizado' && !enPagina;
  const lista = useConsultaPeriodica('/chats', revision, visible);
  const detalle = useConsultaPeriodica(chatId ? `/chats/${chatId}` : null, revision, visible);
  const { total } = useAvisosMensajes();
  const minimizar = () => { devolverFoco.current = true; setModo('minimizado'); };
  useEffect(() => {
    if (visible) panel.current?.focus({ preventScroll: true });
    else if (devolverFoco.current) { devolverFoco.current = false; boton.current?.focus({ preventScroll: true }); }
  }, [visible]);
  if (enPagina) return null;
  return <aside className={`mensajes-flotantes mensajes-flotantes--${modo}`} aria-label="Mensajes flotantes">
    <BotonMensajesFlotantes ref={boton} total={total} controles="ventana-mensajes" oculto={visible} onAbrir={() => setModo('compacto')} />
    <section ref={panel} id="ventana-mensajes" className="mensajes-flotantes__ventana" hidden={!visible} tabIndex={-1}
      aria-label="Ventana de mensajes" onKeyDown={(e) => { if (e.key === 'Escape' && !e.defaultPrevented && !e.target.closest('.buscador-chat, .confirmar-eliminar')) minimizar(); }}>
      <header className="mensajes-flotantes__barra">
        <strong>Mensajes{total > 0 && <span className="mensajes-flotantes__contador">{total}</span>}</strong>
        <div>
          <button type="button" className="boton-icono" aria-label={modo === 'ampliado' ? 'Achicar mensajes' : 'Ampliar mensajes'} onClick={() => setModo(modo === 'ampliado' ? 'compacto' : 'ampliado')}><span aria-hidden="true">{modo === 'ampliado' ? '▣' : '⛶'}</span></button>
          <button type="button" className="boton-icono" aria-label="Cerrar ventana de mensajes" onClick={minimizar}><Icono nombre="cerrar" tamano={19} /></button>
        </div>
      </header>
      <div className={`mensajes-flotantes__cuerpo${chatId ? ' mensajes-flotantes__cuerpo--con-chat' : ''}`}>
        <div className="mensajes-flotantes__lista">
          {lista.error && !lista.datos ? <Alerta>{lista.error.message}</Alerta> : !lista.datos ? <p role="status">Cargando chats…</p>
            : <Bandeja base={base} chats={lista.datos.chats} activo={chatId} profesional={profesional} onAbrirChat={setChatId} />}
        </div>
        <div className="mensajes-flotantes__chat mensajes__conversacion">
          {!chatId ? <p className="mensajes-flotantes__vacio">Elige una conversación para leer y responder.</p>
            : detalle.error && !detalle.datos ? <><Alerta>{detalle.error.message}</Alerta><button type="button" className="boton-texto" onClick={() => setChatId(null)}>Volver a los chats</button></>
              : !detalle.datos ? <p role="status">Cargando chat…</p>
                : <ChatAbierto key={chatId} base={base} datos={detalle.datos} profesional={profesional} onVolver={() => setChatId(null)}
                  onEnviado={() => setRevision((r) => r + 1)} onEliminado={() => { setChatId(null); setRevision((r) => r + 1); }} />}
        </div>
      </div>
    </section>
  </aside>;
}

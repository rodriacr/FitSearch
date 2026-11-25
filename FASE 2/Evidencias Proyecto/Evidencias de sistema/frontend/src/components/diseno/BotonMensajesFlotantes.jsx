import Icono from '../Icono.jsx';

export default function BotonMensajesFlotantes({ total, onAbrir, controles, oculto = false, ref }) {
  const etiqueta = total > 0 ? `Mensajes, ${total} sin leer` : 'Mensajes';
  return (
    <button ref={ref} type="button" className="mensajes-flotantes__abrir" hidden={oculto}
      aria-label={etiqueta} title={etiqueta} aria-expanded={oculto} aria-controls={controles} onClick={onAbrir}>
      <Icono nombre="chat" tamano={19} />
      <span className="mensajes-flotantes__etiqueta" aria-hidden="true">Mensajes</span>
      {total > 0 && <span className="mensajes-flotantes__contador" aria-hidden="true">{total > 99 ? '99+' : total}</span>}
    </button>
  );
}

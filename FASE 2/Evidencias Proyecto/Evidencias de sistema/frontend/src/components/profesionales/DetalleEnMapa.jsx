import { Link } from 'react-router-dom';
import Icono from '../Icono.jsx';
import useAgenda from '../reservas/useAgenda.js';
import { fechaLarga } from '../../services/agenda.js';
import { direccionDe, etiquetaModalidad } from '../../services/formato.js';

// Detalle de un profesional en la ventana de su marcador (FS-HU-06, SC-22): qué tipo de profesional es, si está
// verificado, dónde atiende y su próxima hora libre. La dirección es la que indica en su ficha (SC-24) o la de su
// establecimiento; sin ninguna se muestra la comuna. "Cómo llegar" abre el punto exacto que el profesional marcó.
export default function DetalleEnMapa({ profesional, desde }) {
  const { id, especialidad, modalidad, verificado, comuna, direccion, establecimiento, ubicacionLat, ubicacionLng } = profesional;
  let lugar;
  if (direccion) lugar = direccionDe(profesional);
  else if (establecimiento?.direccion) lugar = <><strong>{establecimiento.nombre}</strong> · {establecimiento.direccion}</>;
  else if (modalidad === 'online') lugar = `${comuna ? `${comuna}. ` : ''}Atiende solo online.`;
  else lugar = `${comuna || 'Comuna por confirmar'}. Dirección exacta por confirmar con el profesional.`;
  const { datos, error } = useAgenda(`/profesionales/${id}/disponibilidades`, 0);
  const horas = datos?.horarios || [];
  const proxima = horas[0];
  let disponibilidad;
  if (error) disponibilidad = 'No pudimos revisar sus horas. Revisa su ficha.';
  else if (!datos) disponibilidad = 'Revisando horas disponibles…';
  else if (proxima) {
    disponibilidad = `Próxima hora: ${fechaLarga(proxima.fecha)}, ${proxima.horaInicio}`
      + (horas.length > 1 ? ` (${horas.length} horas disponibles)` : '');
  } else disponibilidad = 'Sin horas disponibles por ahora';

  return (
    <div className="detalle-mapa">
      <p className="detalle-mapa__tipo">{especialidad} · {etiquetaModalidad(modalidad)}</p>
      <p className={`detalle-mapa__dato ${verificado ? 'detalle-mapa__dato--verificado' : 'detalle-mapa__dato--sin-verificar'}`}>
        <Icono nombre="escudo" tamano={16} /> {verificado ? 'Verificado por FitSearch' : 'Sin verificar'}
      </p>
      <p className="detalle-mapa__dato">
        <Icono nombre="pin" tamano={16} />
        <span>{lugar}</span>
      </p>
      <p className={`detalle-mapa__dato${proxima ? ' detalle-mapa__dato--disponible' : ''}`} aria-live="polite">
        <Icono nombre="calendario" tamano={16} /> {disponibilidad}
      </p>
      <p className="detalle-mapa__acciones">
        <Link to={`/profesionales/${id}`} state={{ desde }}>Ver ficha y reservar</Link>
        <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${ubicacionLat},${ubicacionLng}`)}`}
          target="_blank" rel="noopener noreferrer">Cómo llegar <span className="solo-lector">(Google Maps, nueva pestaña)</span></a>
      </p>
    </div>
  );
}

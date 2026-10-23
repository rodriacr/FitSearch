import { Link } from 'react-router-dom';
import { Calificacion } from '../Calificacion.jsx';
import Icono from '../Icono.jsx';
import useAgenda from '../reservas/useAgenda.js';
import { fechaLarga } from '../../services/agenda.js';
import { direccionDe, etiquetaModalidad, formatearKm, iniciales } from '../../services/formato.js';

// Detalle del profesional elegido en el mapa o con «Ver en el mapa» (FS-HU-06). Desde la SC-27 va bajo el mapa, junto
// a la lista, en vez de una ventana sobre el marcador (SC-22): qué tipo de profesional es, si está verificado, dónde
// atiende, su próxima hora libre y su descripción. La dirección es la que indica en su ficha (SC-24) o la de su
// establecimiento; sin ninguna se muestra la comuna. "Cómo llegar" abre el punto exacto que el profesional marcó.
export default function DetalleEnMapa({ profesional, desde, onCerrar }) {
  const {
    id, nombre, especialidad, descripcion, modalidad, verificado, comuna, direccion, establecimiento, calificacion, distanciaKm,
    ubicacionLat, ubicacionLng,
  } = profesional;
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
    <section className="detalle-mapa" aria-labelledby="detalle-mapa-nombre">
      <h2 className="solo-lector">Profesional seleccionado</h2>
      <div className="detalle-mapa__cabecera">
        <span className="detalle-mapa__avatar" aria-hidden="true">{iniciales(nombre)}</span>
        <div className="detalle-mapa__identidad">
          <h3 id="detalle-mapa-nombre" className="detalle-mapa__nombre">{nombre}</h3>
          <p className="detalle-mapa__tipo">{especialidad} · {etiquetaModalidad(modalidad)}</p>
          <p className="detalle-mapa__valoracion">
            <Calificacion promedio={calificacion.promedio} total={calificacion.total} />
            {distanciaKm != null && <span>{formatearKm(distanciaKm)}</span>}
          </p>
        </div>
        <button type="button" className="boton-icono detalle-mapa__cerrar" aria-label="Cerrar detalle" onClick={onCerrar}>
          <Icono nombre="cerrar" tamano={20} />
        </button>
      </div>
      <ul className="detalle-mapa__datos">
        <li className={`detalle-mapa__dato ${verificado ? 'detalle-mapa__dato--verificado' : 'detalle-mapa__dato--sin-verificar'}`}>
          <Icono nombre="escudo" tamano={16} /> {verificado ? 'Verificado por FitSearch' : 'Sin verificar'}
        </li>
        <li className="detalle-mapa__dato">
          <Icono nombre="pin" tamano={16} />
          <span>{lugar}</span>
        </li>
        <li className={`detalle-mapa__dato${proxima ? ' detalle-mapa__dato--disponible' : ''}`} aria-live="polite">
          <Icono nombre="calendario" tamano={16} /> {disponibilidad}
        </li>
      </ul>
      {descripcion && <p className="detalle-mapa__descripcion">{descripcion}</p>}
      <p className="detalle-mapa__acciones">
        <Link className="boton boton--principal boton--compacto" to={`/profesionales/${id}`} state={{ desde }}>Ver ficha y reservar</Link>
        <a className="boton boton--secundario boton--compacto"
          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${ubicacionLat},${ubicacionLng}`)}`}
          target="_blank" rel="noopener noreferrer">Cómo llegar <span className="solo-lector">(Google Maps, nueva pestaña)</span></a>
      </p>
    </section>
  );
}

import { Link } from 'react-router-dom';
import { etiquetaModalidad, formatearKm, iniciales } from '../../services/formato.js';
import { Calificacion } from '../Calificacion.jsx';
import Icono from '../Icono.jsx';
import BotonFavorito from './BotonFavorito.jsx';
import './TarjetaProfesional.css';

// Ficha resumida de un profesional. "destacado" es la versión compacta del Inicio; "completa", la de favoritos; "fila",
// la del buscador junto al mapa (SC-27): horizontal, con «Ver en el mapa» y resaltada cuando su marcador lo está.
// No hay fotos de perfil todavía (llegarán con FS-HU-04): se muestran las iniciales.
export default function TarjetaProfesional({
  profesional, variante = 'completa', nivelTitulo = 3, desde, onCambioFavorito, id: idElemento,
  seleccionado = false, resaltado = false, onResaltar, onVerEnMapa,
}) {
  const { id, nombre, especialidad, descripcion, comuna, modalidad, establecimiento, calificacion, distanciaKm, verificado } = profesional;
  const Titulo = `h${nivelTitulo}`;
  const lugar = [comuna || establecimiento?.direccion || 'Ubicación por confirmar', distanciaKm != null && formatearKm(distanciaKm)]
    .filter(Boolean).join(' · ');
  const enlace = <Link to={`/profesionales/${id}`} state={desde ? { desde } : undefined}>{nombre}</Link>;
  const insignia = verificado && (
    <span className="tarjeta-profesional__verificado"><Icono nombre="escudo" tamano={16} /> Verificado</span>
  );

  if (variante === 'fila') {
    const clases = ['tarjeta-profesional', 'tarjeta-profesional--fila',
      seleccionado && 'tarjeta-profesional--seleccionada', resaltado && 'tarjeta-profesional--resaltada'].filter(Boolean).join(' ');
    // El mouse o el foco sobre la tarjeta resaltan su marcador en el mapa.
    const resaltar = onResaltar && { onMouseEnter: () => onResaltar(id), onMouseLeave: () => onResaltar(null),
      onFocus: () => onResaltar(id), onBlur: () => onResaltar(null) };
    return (
      <article id={idElemento} className={clases} {...resaltar}>
        <span className="tarjeta-profesional__iniciales" aria-hidden="true">{iniciales(nombre)}</span>
        <div className="tarjeta-profesional__cuerpo">
          <Titulo className="tarjeta-profesional__nombre">{enlace}</Titulo>
          <p className="tarjeta-profesional__linea">
            <span className="tarjeta-profesional__especialidad">{especialidad}</span>
            <span className="tarjeta-profesional__modalidad">{etiquetaModalidad(modalidad)}</span>
            {insignia}
          </p>
          <p className="tarjeta-profesional__linea">
            <Calificacion promedio={calificacion.promedio} total={calificacion.total} />
            <span className="tarjeta-profesional__lugar"><Icono nombre="pin" tamano={15} /> {lugar}</span>
          </p>
          <p className="tarjeta-profesional__descripcion">{descripcion || 'Este profesional todavía no ha añadido una descripción de sus servicios.'}</p>
          <div className="tarjeta-profesional__acciones">
            {onVerEnMapa && (
              <button type="button" className="tarjeta-profesional__ver-mapa" aria-pressed={seleccionado}
                aria-label={`Ver en el mapa a ${nombre}`} onClick={onVerEnMapa}>
                <Icono nombre="pin" tamano={16} /> Ver en el mapa
              </button>
            )}
            <span className="tarjeta-profesional__ver" aria-hidden="true">Ver perfil <Icono nombre="flecha" tamano={16} /></span>
          </div>
        </div>
        <BotonFavorito profesional={profesional} onCambio={onCambioFavorito} className="tarjeta-profesional__favorito" />
      </article>
    );
  }

  return (
    <article className={`tarjeta-profesional tarjeta-profesional--${variante}`}>
      <div className="tarjeta-profesional__portada">
        <span className="tarjeta-profesional__iniciales" aria-hidden="true">{iniciales(nombre)}</span>
        <BotonFavorito profesional={profesional} onCambio={onCambioFavorito} className="tarjeta-profesional__favorito" />
      </div>
      <div className="tarjeta-profesional__cuerpo">
        <span className="tarjeta-profesional__especialidad">{especialidad}</span>
        <Titulo className="tarjeta-profesional__nombre">{enlace}</Titulo>
        {insignia}
        <Calificacion promedio={calificacion.promedio} total={calificacion.total} />
        <p className="tarjeta-profesional__lugar"><Icono nombre="pin" tamano={15} /> {lugar}</p>
        {variante === 'completa' && (
          <>
            <span className="tarjeta-profesional__modalidad">{etiquetaModalidad(modalidad)}</span>
            <p className="tarjeta-profesional__descripcion">{descripcion || 'Este profesional todavía no ha añadido una descripción de sus servicios.'}</p>
            <span className="tarjeta-profesional__ver" aria-hidden="true">Ver perfil y reseñas <Icono nombre="flecha" tamano={16} /></span>
          </>
        )}
      </div>
    </article>
  );
}

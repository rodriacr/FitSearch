import { Link } from 'react-router-dom';
import { etiquetaModalidad, formatearKm, iniciales } from '../../services/formato.js';
import { Calificacion } from '../Calificacion.jsx';
import Icono from '../Icono.jsx';
import BotonFavorito from './BotonFavorito.jsx';
import './TarjetaProfesional.css';

// Ficha resumida de un profesional. "destacado" es la versión compacta del Inicio; "completa", la del buscador.
// No hay fotos de perfil todavía (llegarán con FS-HU-04): se muestran las iniciales.
export default function TarjetaProfesional({ profesional, variante = 'completa', nivelTitulo = 3, desde, onCambioFavorito }) {
  const { id, nombre, especialidad, descripcion, comuna, modalidad, establecimiento, calificacion, distanciaKm } = profesional;
  const Titulo = `h${nivelTitulo}`;
  const lugar = [comuna || establecimiento?.direccion || 'Ubicación por confirmar', distanciaKm != null && formatearKm(distanciaKm)]
    .filter(Boolean).join(' · ');

  return (
    <article className={`tarjeta-profesional tarjeta-profesional--${variante}`}>
      <div className="tarjeta-profesional__portada">
        <span className="tarjeta-profesional__iniciales" aria-hidden="true">{iniciales(nombre)}</span>
        <BotonFavorito profesional={profesional} onCambio={onCambioFavorito} className="tarjeta-profesional__favorito" />
      </div>
      <div className="tarjeta-profesional__cuerpo">
        <span className="tarjeta-profesional__especialidad">{especialidad}</span>
        <Titulo className="tarjeta-profesional__nombre">
          <Link to={`/profesionales/${id}`} state={desde ? { desde } : undefined}>{nombre}</Link>
        </Titulo>
        
        {/* CORRECCIÓN: Si calificacion no existe, pasa 0 de forma segura en lugar de colapsar */}
        <Calificacion promedio={calificacion?.promedio || 0} total={calificacion?.total || 0} />
        
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
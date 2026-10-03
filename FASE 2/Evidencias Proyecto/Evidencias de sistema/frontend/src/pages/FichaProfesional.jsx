import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import Alerta from '../components/Alerta.jsx';
import { Calificacion } from '../components/Calificacion.jsx';
import EstadoVacio from '../components/EstadoVacio.jsx';
import Icono from '../components/Icono.jsx';
import BotonFavorito from '../components/profesionales/BotonFavorito.jsx';
import Resenas from '../components/profesionales/Resenas.jsx';
import { etiquetaModalidad, iniciales } from '../services/formato.js';
import { obtenerProfesional } from '../services/profesional.service.js';
import './Profesionales.css';

// Ficha de un profesional con sus datos públicos, favorito y reseñas (FS-HU-23, FS-HU-24).
export default function FichaProfesional() {
  const { id } = useParams();
  const { state } = useLocation();
  // "Volver" regresa a la misma búsqueda desde la que se abrió la ficha.
  const volverA = typeof state?.desde === 'string' && state.desde.startsWith('/profesionales') ? state.desde : '/profesionales';
  const [intento, setIntento] = useState(0);
  const [datos, setDatos] = useState(null);
  const clave = `${id}-${intento}`;
  const cargando = datos?.clave !== clave;

  useEffect(() => {
    let activo = true;
    obtenerProfesional(id)
      .then((respuesta) => activo && setDatos({ clave, ...respuesta }))
      .catch((error) => activo && setDatos({ clave, error }));
    return () => { activo = false; };
  }, [clave, id]);

  const volver = <Link className="volver" to={volverA}><Icono nombre="flechaIzquierda" tamano={18} /> Volver a profesionales</Link>;
  if (cargando) return <>{volver}<p className="texto-secundario" role="status">Cargando ficha…</p></>;
  if (datos.error) {
    return (
      <>
        {volver}
        {[400, 404].includes(datos.error.estado) ? (
          <EstadoVacio nivel={1} icono="profesional" titulo="No encontramos este profesional"
            accion={<Link to="/profesionales" className="boton boton--secundario boton--compacto">Ver profesionales</Link>}>
            Puede que la ficha ya no esté disponible.
          </EstadoVacio>
        ) : (
          <div className="buscador__estado">
            <Alerta>{datos.error.message}</Alerta>
            <button type="button" className="boton boton--secundario boton--compacto" onClick={() => setIntento(intento + 1)}>Reintentar</button>
          </div>
        )}
      </>
    );
  }

  const { profesional, resumenResenas, miResena, puedeResenar } = datos;
  const { nombre, especialidad, descripcion, comuna, modalidad, verificado, establecimiento, calificacion, ubicacionLat, ubicacionLng } = profesional;
  const actualizarResenas = (resumen, resena) => setDatos({
    ...datos, resumenResenas: resumen, miResena: resena,
    profesional: { ...profesional, calificacion: { promedio: resumen.promedio, total: resumen.total } },
  });

  return (
    <article className="ficha">
      {volver}
      <header className="ficha__cabecera">
        <span className="ficha__avatar" aria-hidden="true">{iniciales(nombre)}</span>
        <div className="ficha__identidad">
          <span className="tarjeta-profesional__especialidad">{especialidad}</span>
          <h1>{nombre}</h1>
          <div className="ficha__datos">
            <Calificacion promedio={calificacion.promedio} total={calificacion.total} />
            <span><Icono nombre="pin" tamano={16} /> {comuna || 'Comuna por confirmar'}</span>
            <span className="tarjeta-profesional__modalidad">{etiquetaModalidad(modalidad)}</span>
            {verificado && <span className="ficha__verificado"><Icono nombre="escudo" tamano={16} /> Verificado</span>}
          </div>
        </div>
        <BotonFavorito profesional={profesional} className="ficha__favorito" />
      </header>

      <div className="ficha__grilla">
        <section className="ficha__seccion" aria-labelledby="titulo-atencion">
          <h2 id="titulo-atencion">Sobre su atención</h2>
          <p className="ficha__descripcion">{descripcion || 'Este profesional todavía no ha añadido una descripción de sus servicios.'}</p>
        </section>
        <section className="ficha__seccion" aria-labelledby="titulo-lugar">
          <h2 id="titulo-lugar">Lugar de atención</h2>
          <p className="ficha__lugar"><strong>{establecimiento?.nombre || (comuna ? `Atención en ${comuna}` : 'Ubicación de atención')}</strong>
            <span>{establecimiento?.direccion || 'Consulta la dirección exacta directamente con el profesional.'}</span></p>
          <a className="ficha__mapa" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${ubicacionLat},${ubicacionLng}`)}`}
            target="_blank" rel="noopener noreferrer" aria-label={`Ver ubicación de ${nombre} en Google Maps (nueva pestaña)`}>
            Ver ubicación en Google Maps <Icono nombre="flecha" tamano={16} />
          </a>
        </section>
      </div>

      <Resenas profesionalId={profesional.id} nombre={nombre} resumen={resumenResenas} miResena={miResena}
        puedeResenar={puedeResenar} onCambio={actualizarResenas} />
    </article>
  );
}

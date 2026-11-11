import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useParams } from 'react-router-dom';
import Alerta from '../components/Alerta.jsx';
import EstadoVacio from '../components/EstadoVacio.jsx';
import Icono from '../components/Icono.jsx';
import MapaProfesionales from '../components/profesionales/MapaProfesionales.jsx';
import { CATEGORIAS, direccionCompleta } from '../components/establecimientos/categorias.js';
import { obtenerEstablecimiento } from '../services/establecimiento.service.js';
import { iniciales } from '../services/formato.js';
import './Profesionales.css';
import './Establecimientos.css';

// Ficha de un centro de salud o gimnasio (FS-HU-25): nombre, categoría, dirección, ubicación en el mapa y los
// profesionales asociados. «Volver» regresa a la misma búsqueda desde la que se abrió.
export default function FichaEstablecimiento({ categoria }) {
  const { id } = useParams();
  const { state, pathname } = useLocation();
  const datos = CATEGORIAS[categoria];
  const volverA = typeof state?.desde === 'string' && state.desde.startsWith(datos.ruta) ? state.desde : datos.ruta;
  const [intento, setIntento] = useState(0);
  const [respuesta, setRespuesta] = useState(null);
  const clave = `${id}-${intento}`;
  const cargando = respuesta?.clave !== clave;

  useEffect(() => {
    let activo = true;
    obtenerEstablecimiento(id)
      .then((datosApi) => activo && setRespuesta({ clave, ...datosApi }))
      .catch((error) => activo && setRespuesta({ clave, error }));
    return () => { activo = false; };
  }, [clave, id]);

  const volver = (
    <Link className="volver" to={volverA}>
      <Icono nombre="flechaIzquierda" tamano={18} /> Volver a {datos.titulo.toLowerCase()}
    </Link>
  );
  if (cargando) return <div className="ficha-establecimiento">{volver}<p className="texto-secundario" role="status">Cargando ficha…</p></div>;
  if (respuesta.error) {
    return (
      <div className="ficha-establecimiento">
        {volver}
        {[400, 404].includes(respuesta.error.estado) ? (
          <EstadoVacio nivel={1} icono={datos.icono} titulo={`No encontramos ${datos.este}`}
            accion={<Link to={datos.ruta} className="boton boton--secundario boton--compacto">Ver {datos.plural}</Link>}>
            Puede que ya no esté disponible en FitSearch.
          </EstadoVacio>
        ) : (
          <div className="buscador__estado">
            <Alerta>{respuesta.error.message}</Alerta>
            <button type="button" className="boton boton--secundario boton--compacto" onClick={() => setIntento(intento + 1)}>Reintentar</button>
          </div>
        )}
      </div>
    );
  }

  const { establecimiento } = respuesta;
  // Un enlace con la categoría equivocada (/gimnasios/3 de un centro de salud) lleva a la dirección correcta.
  if (establecimiento.categoria !== categoria && CATEGORIAS[establecimiento.categoria]) {
    return <Navigate to={`${CATEGORIAS[establecimiento.categoria].ruta}/${establecimiento.id}`} replace state={state} />;
  }
  const { nombre, profesionales } = establecimiento;
  return (
    <article className="ficha-establecimiento" aria-labelledby="titulo-establecimiento">
      {volver}
      <header className="ficha-establecimiento__cabecera">
        <span className="ficha-establecimiento__icono"><Icono nombre={datos.icono} tamano={30} /></span>
        <div>
          <span className="ficha-establecimiento__categoria">{datos.etiqueta}</span>
          <h1 id="titulo-establecimiento">{nombre}</h1>
          <p className="ficha-establecimiento__direccion"><Icono nombre="pin" tamano={18} /> {direccionCompleta(establecimiento)}</p>
        </div>
      </header>

      <div className="ficha-establecimiento__cuerpo">
        <section className="panel-tarjeta ficha-establecimiento__ubicacion" aria-labelledby="titulo-ubicacion">
          <h2 id="titulo-ubicacion">Ubicación</h2>
          <MapaProfesionales profesionales={[establecimiento]} describir={(e) => `${e.nombre}, ${direccionCompleta(e)}`}
            titulo={`Ubicación de ${nombre} en el mapa`} plural={datos.plural} />
        </section>

        <section className="panel-tarjeta ficha-establecimiento__profesionales" aria-labelledby="titulo-asociados">
          <h2 id="titulo-asociados">Profesionales que atienden aquí</h2>
          {profesionales.length ? (
            <ul className="lista-asociados">
              {profesionales.map((profesional) => (
                <li key={profesional.id}>
                  <Link to={`/profesionales/${profesional.id}`} state={{ desde: pathname, origen: nombre, desdeOrigen: volverA }}
                    className="asociado">
                    <span className="asociado__avatar" aria-hidden="true">{iniciales(profesional.nombre)}</span>
                    <span className="asociado__texto">
                      <span className="asociado__nombre">{profesional.nombre}</span>
                      <span className="asociado__especialidad">{profesional.especialidad}</span>
                    </span>
                    {profesional.verificado && <span className="asociado__verificado"><Icono nombre="escudo" tamano={14} /> Verificado</span>}
                    <Icono nombre="flecha" tamano={16} className="asociado__flecha" />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EstadoVacio compacto icono="profesional" titulo="Aún no hay profesionales asociados">
              Cuando un profesional indique en su ficha que atiende en {datos.este}, aparecerá aquí.
            </EstadoVacio>
          )}
        </section>
      </div>
    </article>
  );
}
